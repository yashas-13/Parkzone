#!/usr/bin/env bash
# ParkZone release script - health-checked deploy with automatic rollback.
#
#   sudo bash ops/deploy.sh              # deploy from the current working tree
#   sudo bash ops/deploy.sh /tmp/release.tgz
#
# Layout assumptions (all under /var/www/parkzone):
#   backend/.env        stable secrets, never inside a release, never deployed over
#   releases/<ts>       immutable release trees, each with its own .venv
#   current -> release  the symlink systemd actually runs
#   previous -> release the last known-good release (what rollback restores)
set -euo pipefail

APP=/var/www/parkzone
SRC_DIR=${APP}/releases
CURRENT=${APP}/current
PREVIOUS=${APP}/previous
SECRETS=${APP}/backend/.env
TIMESTAMP=$(date +%Y%m%d%H%M%S)
RELEASE=${SRC_DIR}/${TIMESTAMP}
HEALTH_URL="http://127.0.0.1:8080/api/health"
SRC=${1:-.}

log()  { printf '\033[0;36m[deploy]\033[0m %s\n' "$*"; }
fail() { printf '\033[0;31m[deploy] ERROR:\033[0m %s\n' "$*" >&2; exit 1; }

rollback() {
  if [ -L "${PREVIOUS}" ] && [ -d "${PREVIOUS}" ]; then
    ln -sfn "${PREVIOUS}" "${CURRENT}"
    systemctl restart parkzone-api || true
    log 'rolled back to the previous release'
  else
    log 'no previous release recorded - manual intervention required'
  fi
}

[ "$(id -u)" -eq 0 ] || fail 'run me with sudo on the VPS'
[ -f "${SRC}/backend/main.py" ] || fail "${SRC} does not look like a ParkZone tree"
[ -f "${SECRETS}" ] || fail "${SECRETS} missing - copy backend/.env.example into place and fill it in"
command -v systemctl >/dev/null || fail 'systemctl not available'

log "creating ${RELEASE}"
mkdir -p "${SRC_DIR}"
mkdir -p "${RELEASE}"
if [ -f "$SRC" ]; then
  tar -xzf "$SRC" -C "${RELEASE}" --strip-components=1
else
  # shellcheck disable=SC2164
  (cd "$SRC" && tar -cf - \
      --exclude='./.git' --exclude='./releases' --exclude='./current' --exclude='./previous' \
      --exclude='*/backend/.env' --exclude='__pycache__' --exclude='.pytest_cache' \
      --exclude='./_archive' .) | tar -xf - -C "${RELEASE}"
fi

# The stable secrets file must never be clobbered and never shipped
[ ! -f "${RELEASE}/backend/.env" ] || rm -f "${RELEASE}/backend/.env"

log 'installing pinned dependencies into this release'
python3 -m venv "${RELEASE}/.venv"
"${RELEASE}/.venv/bin/pip" install --upgrade -q pip
"${RELEASE}/.venv/bin/pip" install -q -r "${RELEASE}/backend/requirements.txt"

log 'running contract tests against this release'
"${RELEASE}/.venv/bin/pip" install -q -r "${RELEASE}/backend/requirements-dev.txt"
( cd "${RELEASE}" && ./.venv/bin/python -m pytest tests -q )

log 'wiring secrets into the release'
cp -a "${SECRETS}" "${RELEASE}/backend/.env"
# owner root, group parkzone, read-only for the service account
chown root:parkzone "${RELEASE}/backend/.env" 2>/dev/null || true
chmod 640 "${RELEASE}/backend/.env"

log 'recording the current release as previous, then flipping'
if [ -L "${CURRENT}" ] && [ -d "${CURRENT}" ]; then
  OLD=$(readlink -f "${CURRENT}" || true)
  if [ -n "${OLD}" ] && [ "${OLD}" != "${RELEASE}" ] && [ -d "${OLD}" ]; then
    ln -sfn "${OLD}" "${PREVIOUS}"
  fi
fi
ln -sfn "${RELEASE}" "${CURRENT}"

log 'restarting the API'
systemctl restart parkzone-api

log 'waiting for health (30s)'
healthy=0
for i in $(seq 1 30); do
  if curl -fsS -m 5 "${HEALTH_URL}" | grep -q '"ok": *true'; then
    log "healthy after ${i}s"
    healthy=1
    break
  fi
  sleep 1
done
if [ "$healthy" -ne 1 ]; then
  rollback
  fail 'health check never came good - rolled back'
fi

log 'reloading nginx'
nginx -t && systemctl reload nginx

curl -fsS -m 10 https://parkzone.in/api/health >/dev/null || { rollback; fail 'public /api/health failed'; }
curl -fsS -m 10 https://parkzone.in/ | grep -qi 'Indian GPUs' || { rollback; fail 'landing page did not render'; }

find "${SRC_DIR}" -maxdepth 1 -mindepth 1 -type d -mtime +7 ! -path "${RELEASE}" -exec rm -rf {} +

log "deployed ${TIMESTAMP}"
log "manual rollback: sudo bash ${APP}/rollback.sh"
