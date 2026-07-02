# AGENTS.md

## Project

TeamStorm MCP Server — MCP-сервер для интеграции Claude Code с TeamStorm API. Предоставляет 48 инструментов для работы с задачами, папками, документами, комментариями, атрибутами, вложениями, правами доступа, связями, пользователями, спринтами, workflow и списанием времени.

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

Доменные области: `folders/`, `tasks/`, `comments/`, `attributes/`, `attachments/`, `permissions/`, `links/`, `users/`, `sprints/`, `workflows/`, `types/`, `workspaces/`, `time-tracking/`, `documents/`, `document-sharing/`, `document-statuses/`, `document-links/`, `document-comments/`.

Паттерн каждой папки:

- `index.ts` — barrel-реэкспорт инструментов + Zod-схем
- `<имя>.ts` — один инструмент: регистрация через `server.registerTool()` + функция `execute`
- Каждая схема имеет опциональный `apiUrl` параметр для переопределения URL API
- В `execute`: `if (apiUrl) client.setBaseUrl(apiUrl)` → вызов клиента → форматирование через `utils/formatters.ts`
- Все инструменты используют `logRequest`/`logResponse`/`logError` из `utils/logger.ts`

### Типы (`src/client/types.ts`)

Полные TS-интерфейсы для всех сущностей TeamStorm. Пагинированные ответы имеют единую структуру: `{ fromToken, maxItemsCount, nextToken, items }`.

### Утилиты

- `utils/logger.ts` — Pino + pino-pretty в dev, ленивое определение `NODE_ENV` (не вызывает `getConfig()` на импорте), рекурсивное redact чувствительных полей
- `utils/formatters.ts` — `formatTaskMarkdown`, `formatTaskListMarkdown`, `formatDocumentMarkdown`, `formatBytes`, `formatDuration`, `formatErrorMarkdown`

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

## Папки

Инструменты `src/tools/folders/`:

| Инструмент                  | Файл           | Тип      | Описание                                                               |
| --------------------------- | -------------- | -------- | ---------------------------------------------------------------------- |
| `teamstorm_list_folders`    | `list.ts`      | прямой   | `GET /folders` с фильтром `name`/`parentId`, пагинация                 |
| `teamstorm_get_folder`      | `get.ts`       | прямой   | `GET /folders/{id}`                                                    |
| `teamstorm_get_folder_tree` | `get-tree.ts`  | составной | Обходит все страницы `listFolders`, строит дерево на клиенте           |
| `teamstorm_find_folder`     | `find.ts`      | составной | По `name` → `listFolders?name=…`; по `id` → `getFolder(id)`; резолвит цепочку родителей для breadcrumb-пути |
| `teamstorm_create_folder`   | `create.ts`    | прямой   | `POST /folders` — `name` (обязательно), `description`, `parentId`      |
| `teamstorm_update_folder`   | `update.ts`    | прямой   | `PATCH /folders/{id}` — переименование, описание, перемещение (`parentId`) |

DELETE-эндпоинт папок намеренно не реализован.

Клиентские методы в `src/client/teamstorm.ts`: `listFolders()`, `getFolder()`, `createFolder()`, `patchFolder()`.
Типы в `src/client/types.ts`: `TeamStormFolderModel`, `TeamStormFolderListResponse`, `TeamStormCreateFolderRequest`, `TeamStormPatchFolderRequest`.

**Как найти задачи в папке:**
1. `teamstorm_find_folder` name="…" → получить `folderId`
2. `teamstorm_list_tasks` parent=`folderId` → все задачи в папке

## Документы

Инструменты в `src/tools/documents/` (list, get, create, update, block, unblock), `document-sharing/` (list, create, update), `document-statuses/` (list, get), `document-links/` (list-tasks, create, list-documents), `document-comments/` (list, create). DELETE-эндпоинты документов намеренно не реализованы.

Клиентские методы в `src/client/teamstorm.ts`: `listDocuments()`, `getDocument()`, `createDocument()`, `patchDocument()`, `blockDocument()`, `unblockDocument()`, `listDocumentPermissions()`, `createDocumentPermission()`, `patchDocumentPermission()`, `listDocumentStatuses()`, `getDocumentStatus()`, `getDocumentWorkitemLinks()`, `createDocumentWorkitemLink()`, `getWorkitemDocumentLinks()`, `listDocumentComments()`, `createDocumentComment()`.

Типы: `TeamStormDocument`, `TeamStormDocumentListResponse`, `TeamStormDocumentStatus`, `TeamStormDocumentPermission`, `TeamStormCreateDocumentRequest`.

## Особенности TeamStorm API

### Создание задач и атрибуты

- **URL должен быть `https://`** — сервер возвращает 301 redirect с `http://` на `https://`. Axios при redirect с POST теряет Authorization-заголовок, что приводит к 500. Убедись, что `TEAMSTORM_API_URL` в `.env` использует `https://`.
- **`apiUrl` не должен попадать в тело запроса** — схема `CreateWorkitemRequestBody` имеет `additionalProperties: false`, лишние поля дают 500. В `create.ts` `apiUrl` нужно явно вырезать из деструктуризации: `const { ..., apiUrl: _apiUrl, ...taskData } = params`.
- **Атрибуты при создании не сохраняются** (UniSelect, Tag) — поле `attributes` в create-запросе принимается без ошибки, но значения не применяются. Исключение: тип `Date` сохраняется. Устанавливать атрибуты нужно отдельными PUT-запросами на `/workitems/{id}/attributes/{attributeId}` после создания задачи.
- **Значения атрибутов — имена, не UUID** — PUT `/attributes/{attributeId}` принимает `value` как строку-**имя** опции (например `"🟥 Высокий"`), а не UUID опции. Формат: UniSelect → `{"type":"UniSelect","value":"Имя опции"}`, Tag → `{"type":"Tag","value":["Имя опции"]}`.
- **После изменений в `.env` или коде** — требуется перезапуск MCP-сервера (`npm start` или рестарт Claude Code), так как `.env` читается при старте процесса.

### Документы

- **`PATCH /documents/{id}` меняет только `status`** — схема `PatchDocumentRequestBody` содержит единственное поле `status`. Название, содержимое и метки через публичный API изменить нельзя.
- **`POST /documents/{id}/workitem-links` возвращает 204 No Content** — клиентский метод `createDocumentWorkitemLink()` ничего не возвращает; не пытайтесь парсить тело ответа.
- **Выдача доступа (`POST /documents/{id}/sharing`)** — дискриминированное тело: `type=User` требует `userId`, `type=Group` требует `groupId`. Валидация в Zod-схеме через `superRefine`.

## Docker

```bash
docker-compose up -d    # запуск
docker-compose logs -f  # логи
docker-compose down     # остановка
```
