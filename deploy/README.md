# Production deployment

Схема deployment:

```text
https://<PUBLIC_DOMAIN>
  -> gateway-01 (TLS)
  -> prodfront.mcs.local:3009
  -> portal-documents:3000
  -> опционально /api -> DOCUMENTS_API_URL во внутренней сети
```

Frontend-контейнер публикуется только на приватном IP `prodfront`. Публичный
домен, wildcard TLS и маршрут до `prodfront.mcs.local:3009` настраиваются в
`gatewaytodo` после выбора домена.

По умолчанию сохраняется исходный IndexedDB-режим проекта. Для внешнего API в
`.env.prod` задаются одновременно `VITE_DOCUMENTS_API_URL=/api` и внутренний
`DOCUMENTS_API_URL`; после этого frontend необходимо пересобрать.

## Первый запуск тестовой ветки

1. На `prodfront` создать read-only deploy key репозитория и SSH alias
   `github-portal-documents`.
2. Локально выполнить `cp deploy/.env.deploy.example deploy/.env.deploy`.
3. Заполнить SSH-цель, каталог и выбранный публичный домен.
4. Запушить ветку `deploy-update`.
5. Выполнить `REV=origin/deploy-update make deploy-bootstrap`.
6. Скрипт создаст `.env.prod` на сервере; заполнить его и повторить bootstrap.
7. Добавить домен и upstream `prodfront.mcs.local:3009` в `gatewaytodo`.

## GitHub Actions

После merge в `main` workflow автоматически выполняет проверку и deployment.
Обязательные repository secrets:

- `DEPLOY_SSH_KEY`
- `DEPLOY_KNOWN_HOSTS`
- `DEPLOY_HOST`
- `DEPLOY_JUMP_HOST`
- `DEPLOY_DIR`
- `DEPLOY_DOMAIN`

`TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID` опциональны.

## Команды

```bash
make deploy-bootstrap
make deploy-frontend
make deploy-status
make deploy-logs
FOLLOW=1 make deploy-logs
REV=<commit-sha> make deploy-frontend
```
