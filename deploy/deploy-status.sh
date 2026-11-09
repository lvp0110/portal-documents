#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/_lib.sh"

info "состояние frontend-контейнера"
compose "ps web"

info "внутренний health-check контейнера"
body="$(compose "exec -T web node -e \"fetch('http://127.0.0.1:3000/__health').then(async r=>{console.log(await r.text());process.exit(r.ok?0:1)}).catch(()=>process.exit(1))\"")"
printf '  %s\n' "$body"
printf '%s' "$body" | grep -Eq '\{"ok":true\}' || fail "неожиданный внутренний health-response"

if [ -n "$DEPLOY_DOMAIN" ]; then
  info "публичный health-check https://$DEPLOY_DOMAIN/__health"
  body="$(curl -fsS --retry 5 --retry-delay 3 --retry-all-errors "https://$DEPLOY_DOMAIN/__health")"
  printf '  %s\n' "$body"
  printf '%s' "$body" | grep -Eq '^\{[[:space:]]*"ok"[[:space:]]*:[[:space:]]*true[[:space:]]*\}$' \
    || fail "домен ответил, но это не portal-documents"
  ok "публичный frontend отвечает"
fi
