#!/usr/bin/env bash
# ParkZone end-to-end smoke test over real HTTP.
#   ./tests/smoke.sh                       # local dev on :8080
#   ./tests/smoke.sh https://parkzone.in   # production
set -uo pipefail

BASE="${1:-http://127.0.0.1:8080}"
BODY="$(mktemp 2>/dev/null || echo /data/data/com.termux/files/home/tmp/pz-smoke-body.json)"
HOST_ID="PC_SMOKE$(( RANDOM % 9000 + 1000 ))"
EMAIL="smoke$(( RANDOM % 9000 + 1000 ))@parkzone.in"
PASS=0; FAIL=0

hit()   { curl -s -o "$BODY" -m 20 -w '%{http_code}' "$@"; }
check() { if [ "$2" = "$3" ]; then PASS=$((PASS+1)); printf '  ok    %-50s %s\n' "$1" "$3";
          else FAIL=$((FAIL+1)); printf '  FAIL  %-50s want %s got %s\n' "$1" "$2" "$3"; fi; }
field() { python3 -c "import json,sys;print(json.load(open(sys.argv[1])).get(sys.argv[2],''))" "$BODY" "$1" 2>/dev/null; }

echo "ParkZone smoke test -> $BASE"
echo "-- health & metadata"
check 'GET  /api/health'                    200 "$(hit "$BASE/api/health")"
check 'GET  /api/version'                   200 "$(hit "$BASE/api/version")"
check 'GET  /api'                           200 "$(hit "$BASE/api")"
check 'GET  /api/docs (OpenAPI UI)'         200 "$(hit "$BASE/api/docs")"
check 'GET  /api/openapi.json'              200 "$(hit "$BASE/api/openapi.json")"
check 'GET  /api/does-not-exist'            404 "$(hit "$BASE/api/does-not-exist")"

echo "-- host onboarding"
HB='{"host_id":"'"$HOST_ID"'","gpu_model":"NVIDIA GeForce RTX 4090","vram":24564,"city":"Mumbai","price_per_hour":21,"owner_email":"host@parkzone.in"}'
check 'POST /api/heartbeat'                 200 "$(hit -X POST "$BASE/api/heartbeat" -H 'Content-Type: application/json' -d "$HB")"
check 'POST /api/heartbeat bad host_id'     422 "$(hit -X POST "$BASE/api/heartbeat" -H 'Content-Type: application/json' -d '{"host_id":"x","price_per_hour":21}')"
check 'POST /api/heartbeat bad price'       422 "$(hit -X POST "$BASE/api/heartbeat" -H 'Content-Type: application/json' -d "$(echo "$HB" | sed 's/"price_per_hour":21/"price_per_hour":999/')")"
check 'GET  /api/gpus'                      200 "$(hit "$BASE/api/gpus")"
check 'GET  /api/gpus?min_vram=oob'         422 "$(hit "$BASE/api/gpus?min_vram=999999")"
check 'GET  /api/stats'                     200 "$(hit "$BASE/api/stats")"

echo "-- wallet"
check 'GET  /api/wallet?email=bad'          422 "$(hit "$BASE/api/wallet?email=not-an-email")"
check 'POST /api/wallet/add amount<min'     422 "$(hit -X POST "$BASE/api/wallet/add" -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"amount\":10}")"
check 'POST /api/wallet/add'                200 "$(hit -X POST "$BASE/api/wallet/add" -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"amount\":50000,\"idempotency_key\":\"smoke-$HOST_ID\"}")"

echo "-- renting"
check 'POST /api/rent unknown host'         404 "$(hit -X POST "$BASE/api/rent" -H 'Content-Type: application/json' -d "{\"host_id\":\"PC_NOPE$HOST_ID\",\"renter_email\":\"$EMAIL\"}")"
check 'POST /api/rent bad image'            422 "$(hit -X POST "$BASE/api/rent" -H 'Content-Type: application/json' -d "{\"host_id\":\"$HOST_ID\",\"renter_email\":\"$EMAIL\",\"docker_image\":\"evil/miner:latest\"}")"
check 'POST /api/rent unfunded account'     402 "$(hit -X POST "$BASE/api/rent" -H 'Content-Type: application/json' -d "{\"host_id\":\"$HOST_ID\",\"renter_email\":\"broke$RANDOM@parkzone.in\"}")"
check 'POST /api/rent'                      200 "$(hit -X POST "$BASE/api/rent" -H 'Content-Type: application/json' -d "{\"host_id\":\"$HOST_ID\",\"renter_email\":\"$EMAIL\",\"idempotency_key\":\"rent-$HOST_ID\"}")"
INSTANCE="$(field instance_id)"
SSH="$(field ssh)"
case "$SSH" in *" -p "*) PASS=$((PASS+1)); printf '  ok    %-50s %s\n' 'ssh handle issued' "$SSH";;
  *) FAIL=$((FAIL+1)); printf '  FAIL  %-50s got %s\n' 'ssh handle issued' "$SSH";; esac
check 'POST /api/rent replay (idempotent)'  200 "$(hit -X POST "$BASE/api/rent" -H 'Content-Type: application/json' -d "{\"host_id\":\"$HOST_ID\",\"renter_email\":\"$EMAIL\",\"idempotency_key\":\"rent-$HOST_ID\"}")"
check 'GET  /api/jobs (host dispatch)'     200 "$(hit "$BASE/api/jobs?host_id=$HOST_ID")"
check 'GET  /api/instances'                 200 "$(hit "$BASE/api/instances?email=$EMAIL")"

echo "-- metering & teardown"
check 'POST /api/stop wrong owner'          403 "$(hit -X POST "$BASE/api/stop" -H 'Content-Type: application/json' -d "{\"instance_id\":\"$INSTANCE\",\"renter_email\":\"other@parkzone.in\"}")"
check 'POST /api/stop'                      200 "$(hit -X POST "$BASE/api/stop" -H 'Content-Type: application/json' -d "{\"instance_id\":\"$INSTANCE\"}")"
check 'POST /api/stop twice'                409 "$(hit -X POST "$BASE/api/stop" -H 'Content-Type: application/json' -d "{\"instance_id\":\"$INSTANCE\"}")"
check 'POST /api/stop bad id'               404 "$(hit -X POST "$BASE/api/stop" -H 'Content-Type: application/json' -d '{"instance_id":"not-an-id"}')"
check 'GET  /api/ledger'                    200 "$(hit "$BASE/api/ledger?email=$EMAIL")"
check 'GET  /api/wallet after billing'      200 "$(hit "$BASE/api/wallet?email=$EMAIL")"
echo "  balance now: $(field balance) paise | instance: $INSTANCE"

rm -f "$BODY"
echo
echo "PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ] || exit 1
echo 'ALL SMOKE CHECKS PASSED'
