# TeamStorm MCP Server — Руководство по развёртыванию

Практическое руководство по разворачиванию сервера в разных сценариях. Инструкции по подключению клиентов (Claude Code, Codex, Cursor, Claude Desktop) — в основном [README.md](README.md#быстрый-старт).

## Что важно знать про архитектуру

- **Только HTTP-режим.** Сервер запускается как долгоживущий HTTP-сервис (`node dist/index.js`), stdio-режима нет. MCP-эндпоинт: `POST`/`GET /mcp` (алиас — `/sse`). Health-check — на отдельном порту `PORT + 1`.
- **Сессии хранятся в памяти процесса.** Каждый клиент при `initialize` получает `mcp-session-id`, который живёт только в оперативной памяти контейнера (`Map` в [`src/index.ts`](src/index.ts)). Из этого следует главное операционное правило: **после любого перезапуска/пересборки сервера все подключённые клиенты теряют сессию и должны переподключиться** (см. [Обновление и пересборка](#обновление-и-пересборка)).
- **Аутентификация — на уровне запроса.** Токен берётся из заголовка `Authorization: Bearer <token>` или `Authorization: PrivateToken <token>`. Если задан серверный `TEAMSTORM_API_TOKEN`, он используется как fallback (single-user режим).

---

## Переменные окружения

| Переменная            | Обязательность | По умолчанию                                                | Назначение                                                                                       |
| --------------------- | -------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `TEAMSTORM_API_URL`   | **Да**         | —                                                          | Базовый URL TeamStorm API: `https://<host>/cwm/public/api/v1`. Без него сервер не стартует.        |
| `TEAMSTORM_API_TOKEN` | Нет            | —                                                          | Серверный PrivateToken. Если задан → single-user режим (см. ниже). Если нет → каждый клиент шлёт свой токен. |
| `TEAMSTORM_WORKSPACE` | Нет            | —                                                          | Workspace по умолчанию, если инструмент вызван без `workspace`.                                    |
| `PORT`                | Нет            | `3001`                                                     | Порт MCP-эндпоинта. Health-check поднимается на `PORT + 1` (по умолчанию `3002`).                  |
| `LISTEN_HOST`         | Нет            | `127.0.0.1` если задан `TEAMSTORM_API_TOKEN`, иначе `0.0.0.0` | Интерфейс прослушивания. Явно задавайте `0.0.0.0` для доступа по сети при заданном токене.         |
| `NODE_ENV`            | Нет            | `production`                                                | `development` / `production` / `test`.                                                            |
| `TRUST_PROXY`         | Нет            | `false`                                                    | Доверять `X-Forwarded-For`. Включать **только** за reverse-proxy.                                  |

> ⚠️ **Связка токена и `LISTEN_HOST`.** Когда `TEAMSTORM_API_TOKEN` задан, сервер по умолчанию слушает только `127.0.0.1`, чтобы серверный токен нельзя было использовать анонимно из сети. Если вы намеренно открываете такой сервер по сети (`LISTEN_HOST=0.0.0.0`), помните: **любой, кто дотянется до порта, сможет создать сессию под серверным токеном**. Для сетевого доступа предпочтителен multi-user режим (без серверного токена).

---

## Сценарий 1. Локально, single-user (рекомендуется для личной работы)

Один пользователь, сервер сам подставляет токен. Клиентам токен передавать не нужно.

`.env`:

```bash
TEAMSTORM_API_URL=https://work.teamstorm.io/cwm/public/api/v1
TEAMSTORM_API_TOKEN=ваш_приватный_токен
PORT=3001
NODE_ENV=production
```

Запуск:

```bash
docker compose up -d --build
```

- Сервер слушает `127.0.0.1:3001` (токен задан → только локальный доступ).
- MCP-эндпоинт: `http://localhost:3001/mcp`, health: `http://localhost:3002/health`.
- В конфигах клиентов заголовок `Authorization` можно **не** указывать.

---

## Сценарий 2. Локально/LAN, multi-user

Серверный токен не задаётся — каждый клиент передаёт свой PrivateToken в заголовке `Authorization`. Подходит для команды в одной сети.

`.env`:

```bash
TEAMSTORM_API_URL=https://work.teamstorm.io/cwm/public/api/v1
# TEAMSTORM_API_TOKEN намеренно не задан
PORT=3001
NODE_ENV=production
# LISTEN_HOST не задан → 0.0.0.0 автоматически (токена нет)
```

Запуск:

```bash
docker compose up -d --build
```

- Сервер слушает `0.0.0.0:3001` — доступен по IP машины: `http://192.168.x.x:3001/mcp`.
- Каждый клиент обязан слать `Authorization: PrivateToken <свой_токен>` (Codex — `Bearer`).
- `mcp-remote`/Claude Desktop к `http://` подключаются с флагом `--allow-http`.

---

## Сценарий 3. Удалённый сервер за HTTPS (reverse-proxy)

Публичный или корпоративный сервер с TLS. За nginx/Caddy/Traefik, которые терминируют HTTPS и проксируют на контейнер.

`.env`:

```bash
TEAMSTORM_API_URL=https://work.teamstorm.io/cwm/public/api/v1
PORT=3001
NODE_ENV=production
LISTEN_HOST=0.0.0.0     # контейнер слушает все интерфейсы внутри сети docker
TRUST_PROXY=true        # доверяем X-Forwarded-* от вашего proxy
```

Пример nginx:

```nginx
server {
    listen 443 ssl;
    server_name mcp.example.com;
    ssl_certificate     /etc/letsencrypt/live/mcp.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mcp.example.com/privkey.pem;

    location /mcp {
        proxy_pass http://127.0.0.1:3001/mcp;
        proxy_http_version 1.1;

        # SSE-стрим сервер→клиент: не буферизуем, держим соединение открытым
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_read_timeout 3600s;

        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

- Клиенты используют `https://mcp.example.com/mcp` — для настоящего HTTPS флаг `--allow-http` в `mcp-remote` **не нужен**.
- `proxy_buffering off` и большой `proxy_read_timeout` важны: MCP держит долгоживущий SSE-стрим, при буферизации клиент будет получать `SSE stream disconnected`.
- Порт `3001` наружу не публикуйте — только через proxy. Health-порт `3002` оставьте внутренним.

---

## Сценарий 4. Bare Node (без Docker)

Для отладки или окружений без Docker. Требуется Node.js 20+.

```bash
npm ci
npm run build
# .env должен лежать рядом (dotenv загружает его автоматически)
npm start          # = node dist/index.js
```

Для разработки с hot-reload:

```bash
npm run dev        # tsx src/index.ts
```

---

## Несколько инстансов (разные бэкенды TeamStorm)

Чтобы одновременно обслуживать разные TeamStorm-инстансы (например, work и sales), поднимите отдельный контейнер на своём порту со своим env-файлом. В репозитории уже есть `.env` (work) и `.env.sales`.

```bash
# инстанс sales на порту 3101/3102, отдельным compose-проектом
docker compose -p teamstorm-sales --env-file .env.sales \
  up -d --build
```

Чтобы порты не конфликтовали, задайте разный `PORT` в каждом env-файле (health-порт всегда `PORT + 1`) и уникальное `-p <project>`. Клиенты подключаются к соответствующему `http://localhost:<PORT>/mcp`.

> Альтернатива для разовых запросов к другому инстансу — параметр `apiUrl` прямо в инструменте (см. README, раздел «Работа с несколькими инстансами»). Отдельный контейнер нужен, только если второй бэкенд используется постоянно.

---

## Обновление и пересборка

⚠️ **Главное правило:** сессии живут в памяти, поэтому **любая пересборка/перезапуск обрывает все активные подключения**. Подключённые клиенты (особенно Claude Desktop через `mcp-remote`) продолжат слать старый `mcp-session-id`, которого в новом процессе нет, и получат ошибки:

```
Failed to open SSE stream: Bad Request
Bad Request: Server not initialized
```

Штатный порядок обновления:

```bash
git pull
docker compose up -d --build          # пересобрать и пересоздать контейнер
docker compose logs -f teamstorm-mcp   # убедиться, что стартовал (Ctrl+C для выхода)
```

После этого **переподключите клиентов**:

- **Claude Desktop** — полностью выйти (⌘Q / Quit) и открыть заново. Это перезапускает `mcp-remote` с чистым `initialize`. Просто закрыть окно недостаточно.
- **Claude Code / Cursor / Codex** — перезапустить IDE (или переоткрыть чат/сессию MCP).

Полная чистая сборка без кеша:

```bash
docker compose build --no-cache && docker compose up -d
```

---

## Проверка работоспособности

```bash
# 1. Контейнер поднят и healthy
docker ps --filter name=teamstorm-mcp-server

# 2. Health-эндпоинт (порт PORT+1)
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3002/health   # ожидаем 200

# 3. MCP-эндпоинт жив (401 без токена — это нормально: значит сервис отвечает и требует аутентификацию)
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://127.0.0.1:3001/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"ping"}'                          # ожидаем 401

# 4. Полный MCP-хендшейк с токеном и список инструментов
SID=$(curl -s -D - -o /dev/null -X POST http://127.0.0.1:3001/mcp \
  -H 'Authorization: Bearer ВАШ_ТОКЕН' \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":0,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"check","version":"0.0.1"}}}' \
  | awk 'tolower($1)=="mcp-session-id:"{print $2}' | tr -d '\r')
curl -s -X POST http://127.0.0.1:3001/mcp \
  -H 'Authorization: Bearer ВАШ_ТОКЕН' -H "mcp-session-id: $SID" \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

### Диагностика

| Симптом                                             | Причина / решение                                                                                     |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `Bad Request: Server not initialized` у клиента     | Клиент держит сессию от старого процесса. Переподключите клиент (см. [Обновление](#обновление-и-пересборка)). |
| Контейнер `unhealthy`, но сервис отвечает           | Healthcheck должен обращаться к `http://127.0.0.1:3002/health` (не `localhost` — внутри контейнера он резолвится в IPv6 `::1`, а сервер слушает IPv4). |
| `SSE stream disconnected` / частые обрывы за proxy  | На reverse-proxy включите `proxy_buffering off` и увеличьте `proxy_read_timeout`.                       |
| `mcp-remote`: требует HTTPS                          | Для `http://` добавьте `--allow-http` в аргументы. Для настоящего HTTPS флаг не нужен.                  |
| `TEAMSTORM_API_URL не задан`, контейнер падает      | Задайте `TEAMSTORM_API_URL` в `.env`. Формат: `https://<host>/cwm/public/api/v1`.                      |
| `401` при вызове инструмента, хотя сессия создалась  | Токен сессии не совпал с токеном запроса, либо клиент шлёт пустой `Authorization`. Проверьте заголовок. |

---

## Замечания по безопасности

- Не публикуйте порт `3001` в интернет напрямую — только через HTTPS reverse-proxy.
- Не открывайте по сети сервер с заданным `TEAMSTORM_API_TOKEN` (single-user) без явной необходимости: серверный токен станет доступен всем, кто дотянется до порта. Для команды используйте multi-user режим.
- `TRUST_PROXY=true` включайте **только** когда перед сервером действительно стоит доверенный proxy, иначе `X-Forwarded-For` можно подделать.
- Загрузка файлов (`/upload`) требует того же `Authorization`-заголовка; ограничения — 50 MB, TTL 1 час, 10 загрузок/мин (см. README).
