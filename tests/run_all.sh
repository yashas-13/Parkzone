#!/usr/bin/env bash
# One command that runs every check. This is what CI and the release process run.
#
#   bash tests/run_all.sh          # static + contract checks
#   bash tests/run_all.sh --live   # + boot the API once and exercise real HTTP
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
FAIL=0
LIVE=0
[ "${1:-}" = "--live" ] && LIVE=1
API_LOG="${TMPDIR:-/data/data/com.termux/files/home/tmp}/pz-runall.log"

step()   { echo; echo "=== $1 ==="; }
report() { if [ "$1" -ne 0 ]; then FAIL=$((FAIL+1)); echo "  -> STEP FAILED"; fi; }
stop_api() { pkill -f '[u]vicorn main:app' 2>/dev/null || true; }

if [ "$LIVE" = 1 ]; then
  stop_api
  ( cd backend && MONGO_URI= PZ_DEV_MODE=true PZ_ADMIN_TOKEN=testtoken \
      python3 -m uvicorn main:app --host 127.0.0.1 --port 8080 --log-level warning > "$API_LOG" 2>&1 & )
  for i in $(seq 1 25); do
    curl -fsS -m 3 http://127.0.0.1:8080/api/health >/dev/null 2>&1 && break
    sleep 1
  done
  trap stop_api EXIT
fi

step 'python syntax (backend + ops)'
python3 -m py_compile backend/main.py backend/db.py backend/agent.py
report $?

step 'API contract tests (pytest)'
python3 -m pytest tests -q
report $?

step 'front-end integrity (classes, links, CSP, a11y, SEO)'
python3 tests/check_frontend.py
report $?

step 'front-end render (jsdom, runs the real page scripts)'
if node -e "require('/data/data/com.termux/files/home/tmp/jsdomtest/node_modules/jsdom')" >/dev/null 2>&1 \
   || node -e "require('jsdom')" >/dev/null 2>&1; then
  node tests/render.test.cjs | tail -n 3
  report $?
else
  echo '  skip: jsdom not installed (npm i --no-save jsdom)'
fi

step 'javascript parse check'
for f in public/assets/*.js; do
  node -e "new Function(require('fs').readFileSync('$f','utf8'))" || { echo "  syntax error in $f"; FAIL=$((FAIL+1)); }
done

step 'nginx config validity + routing integration'
if command -v nginx >/dev/null 2>&1; then
  bash ops/validate-nginx.sh --run | tail -6
  report $?
else
  echo '  skip: nginx binary not installed'
fi

if [ "$LIVE" = 1 ]; then
  step 'live HTTP smoke test (real uvicorn on :8080)'
  bash tests/smoke.sh http://127.0.0.1:8080 | tail -6
  report $?
fi

echo
echo "==============================="
if [ "$FAIL" -eq 0 ]; then echo 'ALL CHECKS PASSED'; else echo "$FAIL STEP(S) FAILED"; fi
echo "==============================="
exit $FAIL
