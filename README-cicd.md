# CI/CD: автодеплой через self-hosted runner в Docker

Автоматический деплой TeamStorm MCP Server на домашний сервер при пуше в `main`.
Раннер запускается **в Docker** и сам опрашивает GitHub — публичный IP и вебхуки серверу
не нужны. Общее руководство по развёртыванию — в [README-deploy.md](README-deploy.md).

## Как это устроено

```
dev ──PR/merge──▶ main ──push──▶ GitHub Actions
                                     │
                          ┌──────────┴───────────┐
                          ▼                      ▼
                   job "test"              job "deploy"
              (ubuntu-latest,           (self-hosted, home-lab)
               GitHub-hosted)             только если test зелёный
              npm ci / lint /                     │
              typecheck / test          git reset --hard origin/main
                                        docker compose up -d --build
```

- **`test`** идёт на бесплатном GitHub-hosted раннере (репозиторий публичный) — домашний
  сервер не нагружается.
- **`deploy`** идёт только после успешного `test` (`needs: test`).
- Деплой срабатывает только на `push` в `main` и на ручной `workflow_dispatch`. На
  `pull_request` он **не** запускается — форк-PR не могут выполнить код на вашем раннере.

**Ветки:** `dev` — разработка и тесты; `main` — прод. Мерж/пуш в `main` = релиз.

Workflow: [.github/workflows/deploy.yml](.github/workflows/deploy.yml).

## Почему локальные настройки не затираются

На сервере в каталоге деплоя лежат два файла **вне git** (в `.gitignore`):

- `.env` — переменные окружения (`TEAMSTORM_API_URL`, токен и т.д.);
- `docker-compose.override.yml` — специфичные для машины порты/volume/env
  (шаблон: [docker-compose.override.yml.example](docker-compose.override.yml.example)).

Деплой делает `git reset --hard origin/main` — он обновляет только версионируемые файлы и
**не трогает** игнорируемые. Docker Compose автоматически накладывает override поверх базового
[docker-compose.yml](docker-compose.yml). Конфликтов при обновлении нет.

---

## Пошаговая настройка сервера (Ubuntu)

### Шаг 0. Предпосылки

Установлены Docker Engine и плагин `docker compose`, текущий пользователь — в группе `docker`:

```bash
# Docker Engine + compose plugin (официальный скрипт)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
newgrp docker            # применить группу в текущей сессии (или перелогиниться)
docker compose version   # проверка: плагин доступен
```

### Шаг 1. Каталог деплоя и клон репозитория

Путь `/opt/teamstorm-mcp-server` используется и в workflow, и при монтировании в раннер —
**он должен совпадать**. Если поменяете — поменяйте во всех трёх местах (здесь, в
`deploy.yml` и в `docker-compose.runner.yml`).

```bash
sudo mkdir -p /opt/teamstorm-mcp-server
sudo chown "$USER":"$USER" /opt/teamstorm-mcp-server
cd /opt/teamstorm-mcp-server
git clone https://github.com/saktush/teamstorm-mcp-server.git .
git checkout main
```

Репозиторий публичный, поэтому клон/`fetch` по HTTPS работают без учётных данных.

### Шаг 2. Локальная конфигурация (вне git)

```bash
cd /opt/teamstorm-mcp-server

# .env — обязательно указать TEAMSTORM_API_URL
cp .env.example .env
nano .env

# Override — только если нужны нестандартные порты/volume/env
cp docker-compose.override.yml.example docker-compose.override.yml
nano docker-compose.override.yml
```

Подробнее о переменных и сценариях (single-user / multi-user / за reverse-proxy) — в
[README-deploy.md](README-deploy.md#переменные-окружения).

### Шаг 3. Первый ручной запуск (проверка до автоматизации)

```bash
cd /opt/teamstorm-mcp-server
docker compose up -d --build
docker compose logs -f teamstorm-mcp   # убедиться, что стартовал; Ctrl+C для выхода
```

Health-проверка:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3002/health   # ожидаем 200
```

Полные проверки — в [README-deploy.md](README-deploy.md#проверка-работоспособности).

### Шаг 4. Токен для регистрации раннера

Раннеру нужен доступ к репозиторию. Два варианта:

- **PAT (рекомендуется для Docker-раннера).** Fine-grained или classic Personal Access Token
  со scope `repo` (для classic) или правами `Administration: read/write` на репозиторий (для
  fine-grained). Раннер с PAT сам оформляет и переоформляет регистрацию при рестартах —
  удобно для автозапускающегося контейнера. Создать: GitHub → Settings → Developer settings →
  Personal access tokens.
- **Короткоживущий registration token.** GitHub → репозиторий → Settings → Actions → Runners →
  **New self-hosted runner**. Токен живёт ~1 час; при пересоздании контейнера регистрацию
  придётся повторять. Годится для разовой проверки.

> ⚠️ Токен — секрет. Он попадёт только в `.env` раннера (см. ниже), который в `.gitignore`
> и **никогда не коммитится**.

### Шаг 5. Раннер в Docker (Docker-out-of-Docker)

Раннер запускается контейнером, но управляет **хостовым** Docker через смонтированный сокет,
поэтому `docker compose up` из шага деплоя поднимает контейнеры на хосте (как соседей), а не
внутри раннера.

Создайте на сервере отдельный каталог (например `/opt/gh-runner`) — он **не** часть репозитория:

```bash
sudo mkdir -p /opt/gh-runner && sudo chown "$USER":"$USER" /opt/gh-runner
cd /opt/gh-runner
```

`/opt/gh-runner/.env` (секреты, вне git):

```bash
# PAT со scope repo (вариант с автосамо-регистрацией)
ACCESS_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
# ...либо короткоживущий registration token вместо ACCESS_TOKEN:
# RUNNER_TOKEN=AXXXXXXXXXXXXXXXXXXXXXXXXXX
```

`/opt/gh-runner/docker-compose.runner.yml`:

```yaml
services:
  runner:
    image: myoung34/github-runner:latest
    container_name: gh-runner-teamstorm
    restart: unless-stopped
    env_file: .env
    environment:
      REPO_URL: https://github.com/saktush/teamstorm-mcp-server
      RUNNER_NAME: home-lab-1
      RUNNER_SCOPE: repo
      LABELS: home-lab
      # Не убивать раннер после одного job — держим постоянным:
      EPHEMERAL: "false"
    volumes:
      # Docker-out-of-Docker: управляем хостовым Docker.
      - /var/run/docker.sock:/var/run/docker.sock
      # Каталог деплоя по СОВПАДАЮЩЕМУ пути внутри и снаружи — обязательно,
      # иначе docker compose --build не найдёт контекст сборки на хосте.
      - /opt/teamstorm-mcp-server:/opt/teamstorm-mcp-server
```

Запуск:

```bash
cd /opt/gh-runner
docker compose -f docker-compose.runner.yml up -d
docker compose -f docker-compose.runner.yml logs -f   # дождаться "Listening for Jobs"
```

Проверка: GitHub → репозиторий → Settings → Actions → Runners — раннер `home-lab-1` в статусе
**Idle** с меткой `home-lab`.

### Шаг 6. Проверка полного цикла

```bash
# любой коммит в main (или запустите workflow вручную: Actions → Deploy to Home Lab → Run workflow)
git commit --allow-empty -m "ci: trigger deploy" && git push origin main
```

Ожидаемо: во вкладке **Actions** job `test` зелёный → job `deploy` отработал на `home-lab` →
на сервере:

```bash
docker ps --filter name=teamstorm-mcp-server                       # контейнер healthy
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3002/health   # 200
```

---

## Важно помнить

- **Каждый деплой обрывает MCP-сессии.** Сессии живут в памяти процесса, поэтому после
  пересборки все подключённые клиенты должны переподключиться (Claude Desktop — полный
  перезапуск ⌘Q). Подробнее — [README-deploy.md](README-deploy.md#обновление-и-пересборка).
- **Локальные `.env` и `docker-compose.override.yml` переживают деплой** — `git reset` их не
  трогает, т.к. они в `.gitignore`.

## Безопасность

- PAT/registration token — только в `/opt/gh-runner/.env`, никогда не в репозитории.
  Для PAT берите минимальные права (`repo` / `Administration` на один репозиторий).
- Деплой запускается только на `push` в `main` и `workflow_dispatch`, **не** на
  `pull_request` — это исключает выполнение кода из чужих форк-PR на вашем сервере.
- Раннер имеет доступ к хостовому Docker-сокету (фактически root на хосте). Держите его на
  доверенной машине и не подключайте к нему посторонние репозитории.
- Не публикуйте порт `3001` в интернет напрямую — только через HTTPS reverse-proxy
  (см. [README-deploy.md](README-deploy.md#сценарий-3-удалённый-сервер-за-https-reverse-proxy)).

## Диагностика

| Симптом | Причина / решение |
| ------- | ----------------- |
| Job `deploy` висит в `Queued` | Раннер не в статусе Idle или метка не совпала. Проверьте логи контейнера-раннера и `LABELS: home-lab`. |
| `docker: command not found` в логе деплоя | В контейнере-раннере нет доступа к Docker. Проверьте монтирование `/var/run/docker.sock`. |
| `Cannot locate ... build context` / файлы не те | Путь монтирования каталога деплоя не совпадает с путём в `cd` внутри workflow. Оба должны быть `/opt/teamstorm-mcp-server`. |
| `git reset` затирает мои правки | Правки сделаны в версионируемом файле. Вынесите их в `.env` или `docker-compose.override.yml` (они в `.gitignore`). |
| Раннер отвалился после рестарта (registration token) | Короткоживущий токен истёк. Перейдите на `ACCESS_TOKEN` (PAT). |
