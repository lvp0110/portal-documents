#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/_lib.sh"

TAIL="${TAIL:-200}"
if [ "${FOLLOW:-0}" = "1" ]; then
  compose "logs --tail='$TAIL' -f web"
else
  compose "logs --tail='$TAIL' web"
fi
