# AGENTS.md

## Project

TeamStorm MCP Server — MCP-сервер для интеграции Claude Code с TeamStorm API. Предоставляет 26 инструментов для работы с задачами, комментариями, атрибутами, вложениями, правами доступа, связями, пользователями, спринтами, workflow и списанием времени.

## Commands

```bash
npm run dev              # Dev-режим с hot reload (tsx)
npm run build            # tsc → dist/
npm start                # node dist/index.js
npm run test             # Vitest interactive
npm run test:run         # Vitest single run (CI)
npm run test:coverage    # Vitest + coverage
npm run lint             # ESLint
npm run lint:fix         # ESLint + fix
npm run format           # Prettier write
npm run format:check     # Prettier check
npm run typecheck        # tsc --noEmit
```

Единый тест: `npx vitest run src/__tests__/teamstorm.test.ts`

## Architecture

### Точка входа (`src/index.ts`)

- HTTP-сервер слушает на `LISTEN_HOST:PORT` (default: `127.0.0.1:3001` если задан `TEAMSTORM_API_TOKEN`, иначе `0.0.0.0:3001`), health-check на том же хосте, `PORT+1` (3002)
- Сессионная модель: первый запрос без `mcp-session-id` создаёт новый `McpServer` + `TeamStormClient`; повторные запросы с тем же `mcp-session-id` переиспользуют transport и обновляют токен через `setToken()`. Состояние хранится в `transports` и `sessionClients` (Map по sessionId).
- `resolveToken(req)` — извлекает токен из заголовка `Authorization: Bearer <token>` или `Authorization: PrivateToken <token>`, fallback на `TEAMSTORM_API_TOKEN` из `.env`. Обеспечивает multi-user HTTP режим.
- Endpoints:
  - `POST /mcp`, `GET /mcp` — основной MCP endpoint
  - `POST /sse`, `GET /sse` — SSE-совместимый MCP endpoint (тот же handler)
  - `POST /upload` — загрузка файлов (auth + rate limit)
- Middleware инжектирует `Accept: application/json, text/event-stream` для MCP-клиентов (Claude Code, Cursor), которые не передают его
- Конфигурация загружается через Zod-валидацию из `.env` (ленивая, без `process.exit()` на импорте)

### Клиент (`src/client/teamstorm.ts`)

- `TeamStormClient` — единый класс для всех вызовов TeamStorm REST API через axios
- Конструктор: `(token, baseUrl?, workspace?)`
- `setBaseUrl(url)` — переключение URL в рантайме с нормализацией (используется когда LLM передаёт `apiUrl` в инструменте)
- `setBaseUrlRaw(url)` — то же без нормализации URL
- `setToken(token)` — обновление токена в рантайме (используется при session refresh для multi-user HTTP режима)
- `requireBaseUrl()` — guard: бросает ошибку если URL не задан ни в `.env` ни через `apiUrl`
- `internalApiUrl` — для методов списания времени, которые ходят на отдельный endpoint `/tasks/api/v1/...`
- Interceptors: rate-limit мониторинг (предупреждения при <25% и <10% лимита), санитизация заголовков в логах

### Инструменты (`src/tools/`)

Каждая папка = доменная область. Паттерн:

- `index.ts` — barrel-реэкспорт инструментов + Zod-схем
- `<имя>.ts` — один инструмент: регистрация через `server.registerTool()` + функция `execute`
- Каждая схема имеет опциональный `apiUrl` параметр для переопределения URL API
- В `execute`: `if (apiUrl) client.setBaseUrl(apiUrl)` → вызов клиента → форматирование через `utils/formatters.ts`
- Все инструменты используют `logRequest`/`logResponse`/`logError` из `utils/logger.ts`

### Типы (`src/client/types.ts`)

Полные TS-интерфейсы для всех сущностей TeamStorm. Пагинированные ответы имеют единую структуру: `{ fromToken, maxItemsCount, nextToken, items }`.

### Утилиты

- `utils/logger.ts` — Pino + pino-pretty в dev, ленивое определение `NODE_ENV` (не вызывает `getConfig()` на импорте), рекурсивное redact чувствительных полей
- `utils/formatters.ts` — `formatTaskMarkdown`, `formatTaskListMarkdown`, `formatBytes`, `formatDuration`, `formatErrorMarkdown`

## Конфигурация

Переменные окружения (Zod-валидация в `src/config.ts`, ленивая — `getConfig()` вызывается только при первом обращении):

- `TEAMSTORM_API_URL` — базовый URL API (опционально, можно передать через `apiUrl` в каждом инструменте)
- `TEAMSTORM_API_TOKEN` — PrivateToken (опциональный: в HTTP режиме токен берётся из заголовка `Authorization` каждого запроса; переменная нужна только для single-user деплоя или как fallback)
- `TEAMSTORM_WORKSPACE` — необязательный, workspace по умолчанию
- `PORT` — порт MCP-сервера (3001)
- `LISTEN_HOST` — адрес привязки сервера. Если не задан: `127.0.0.1` когда установлен `TEAMSTORM_API_TOKEN` (защита от анонимных сессий по сети), иначе `0.0.0.0`. Задайте `0.0.0.0` явно для сетевого доступа при заданном токене (контейнеры, reverse-proxy).
- `NODE_ENV` — `development` | `production` | `test` (по умолчанию `production`)
- `TRUST_PROXY` — доверять `X-Forwarded-For` для rate limiter (только за reverse-proxy, по умолчанию `false`)

Accessors: `getApiToken()`, `getApiUrl()`, `getWorkspace()`, `getPort()`, `getListenHost()`, `getNodeEnv()`, `getTrustProxy()`

## Загрузка файлов (Out-of-Band)

Файлы загружаются через `POST /upload` → сохраняются в tmp (`teamstorm-uploads`, TTL 1 час) → прикрепляются инструментом `teamstorm_attach_uploaded`. Имена файлов декодируются из CP1251/UTF-8.

Безопасность upload endpoint:

- Аутентификация: `PrivateToken` или `Bearer` в `Authorization`
- Rate limit: 10 запросов/мин на IP (с учётом `TRUST_PROXY`)
- Ограничение размера: 50 МБ
- Права файлов: `0o600` (только владелец)
- Очистка устаревших файлов: каждые 30 минут (удаляются файлы старше 1 часа)

## Docker

```bash
docker-compose up -d    # запуск
docker-compose logs -f  # логи
docker-compose down     # остановка
```
