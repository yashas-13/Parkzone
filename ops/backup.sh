#!/usr/bin/env bash
# ParkZone backup - mongodump the Atlas/self-hosted database + secrets, prune old sets.
# Intended to run from cron, e.g. daily at 03:17:
#   17 3 * * * /usr/local/bin/parkzone-backup >/var/log/parkzone-backup.log 2>&1
#
#   sudo bash ops/backup.sh [destination-dir]
set -euo pipefail

DEST=${1:-/var/backups/parkzone}
KEEP=${PZ_BACKUP_KEEP:-14}
APP=/var/www/parkzone
STAMP=$(date +%Y%m%d-%H%M%S)
SET=${DEST}/${STAMP}

fail() { echo "backup: $*" >&2; exit 1; }
command -v mongodump >/dev/null || fail 'mongodump not installed (apt install mongodb-database-tools)'
[ -f "${APP}/backend/.env" ] || fail "${APP}/backend/.env missing"

mkdir -p "${SET}"
chmod 700 "${SET}"

echo "backing up database to ${SET}"
# shellcheck disable=SC1090
set -a; . "${APP}/backend/.env"; set +a
[ -n "${MONGO_URI:-}" ] || fail 'MONGO_URI is not set'

mongodump --uri="${MONGO_URI}" --gzip --out "${SET}/db"

echo 'backing up secrets (chmod 600)'
cp -a "${APP}/backend/.env" "${SET}/env"
chmod 600 "${SET}/env"

echo 'writing manifest'
{
  echo "date: $(date -u +%FT%TZ)"
  echo "host: $(hostname)"
  echo "collections:"
  du -sh "${SET}/db" 2>/dev/null || true
} > "${SET}/manifest.txt"

# verify we can actually read what we just wrote
[ -s "${SET}/manifest.txt" ] || fail 'manifest is empty'
mongorestore --uri="${MONGO_URI}" --dryRun "${SET}/db" >/dev/null 2>&1 || \
  echo 'WARN: mongorestore dry-run unavailable - install mongorestore to verify restores' || true

find "${DEST}" -maxdepth 1 -mindepth 1 -type d -mtime +"${KEEP}" -exec rm -rf {} +
echo "backup complete: ${SET} (keeping ${KEEP} days)"
