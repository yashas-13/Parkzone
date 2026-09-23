#!/usr/bin/env bash
# One command that runs every check. This is what CI and the release process run.
#
#   bash tests/run_all.sh          # static + contract checks
#   bash tests/run_all.sh --live   # + boot uvicorn and exercise real HTTP
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
FAIL=0
LIVE=0
[ "${1:-}" = "--live" ] && LIVE=1

step() { echo; echo "=== $1 ==="; }
report() { if [ "$1" -ne 0 ]; then FAIL=$((FAIL+1)); echo "  -> STEP FAILED"; fi; }

step 'python syntax (backend + ops)'
python3 -m py_compile backend/main.py backend/db.py backend/agent.py 2>/dev/null || python3 -m py_compile backend/main.py backend/db.py backend/agent.py
report $?

step 'API contract tests (pytest)'
python3 -m pytest tests -q
report $?

step 'front-end integrity (classes, links, CSP, a11y, SEO)'
python3 tests/check_frontend.py
report $?

step 'javascript parse check'
for f in public/assets/*.js; do
  node -e "new Function(require('fs').readFileSync('$f','utf8'))" || { echo "  syntax error in $f"; FAIL=$((FAIL+1)); }
done

step 'nginx config validity + routing integration'
if command -v nginx >/dev/null 2>&1; then
  bash ops/validate-nginx.sh --run | tail -4
  report $?
else
  echo '  skip: nginx binary not installed'
fi

if [ "$LIVE" = 1 ]; then
  step 'live HTTP smoke test (boots uvicorn on :8080)'
  pkill -f '[u]vicorn main:app' 2>/dev/null
  ( cd backend && MONGO_URI= PZ_DEV_MODE=true PZ_ADMIN_TOKEN=testtoken python3 -m uvicorn main:app --host 127.0.0.1 --port 8080 --log-level warning > "${TMPDIR:-/tmp}/pz-runall.log" 2>&1 & )
  sleep 6
  bash tests/smoke.sh http://127.0.0.1:8080 | tail -6
  report $?
  pkill -f '[u]vicorn main:app' 2>/dev/null
fi

echo
echo "==============================="
if [ "$FAIL" -eq 0 ]; then echo 'ALL CHECKS PASSED'; else echo "$FAIL STEP(S) FAILED"; fi
echo "==============================="
exit $FAIL
