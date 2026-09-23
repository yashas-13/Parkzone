#!/usr/bin/env bash
# Roll back to the previous ParkZone release and verify the API came healthy.
set -euo pipefail
APP=/var/www/parkzone
[ "$(id -u)" -eq 0 ] || { echo 'run me with sudo' >&2; exit 1; }
[ -L "${APP}/previous" ] || { echo 'no previous release recorded' >&2; exit 1; }
TARGET=$(readlink -f "${APP}/previous")
[ -d "$TARGET" ] || { echo "${TARGET} no longer exists" >&2; exit 1; }
ln -sfn "$TARGET" "${APP}/current"
systemctl restart parkzone-api
for i in $(seq 1 20); do
  if curl -fsS -m 5 http://127.0.0.1:8080/api/health | grep -q '"ok": *true'; then
    echo "rolled back to ${TARGET} - API healthy after ${i}s"
    systemctl reload nginx
    exit 0
  fi
  sleep 1
done
echo 'rollback did not come healthy - journalctl -u parkzone-api -n 50' >&2
exit 1
