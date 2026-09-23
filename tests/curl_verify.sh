#!/usr/bin/env bash
# Explicit curl verification of the whole stack: nginx (the real config, with
# TLS) in front of the FastAPI backend, on the single domain.
#
#   bash ops/validate-nginx.sh --run --keep   # start nginx and leave it up
#   (start the backend on :8080 first)
#   bash tests/curl_verify.sh                 # run this
set -uo pipefail

H='Host: parkzone.in'
HW='Host: www.parkzone.in'
BASE='https://127.0.0.1:8443'
HTTP='http://127.0.0.1:8081'
DIRECT='http://127.0.0.1:8080'
TMPD="${TMPDIR:-/tmp}"
BODY="$TMPD/pz-curl-body.$$"
HEADERS="$TMPD/pz-curl-head.$$"
cleanup() { rm -f "$BODY" "$HEADERS"; }
trap cleanup EXIT
PASS=0
FAIL=0

ok()  { PASS=$((PASS + 1)); printf '  \033[0;32mok\033[0m    %-48s %s\n' "$1" "${2:-}"; }
bad() { FAIL=$((FAIL + 1)); printf '  \033[0;31mFAIL\033[0m  %-48s %s\n' "$1" "${2:-}"; }
expect() { if [ "$2" = "$3" ]; then ok "$1" "$3"; else bad "$1" "want=$2 got=$3"; fi; }

sget()  { curl -sk -o "$BODY" -m 15 -w '%{http_code}' "$@"; }
shead() { curl -sk -o /dev/null -D "$HEADERS" -m 15 -w '%{http_code}' "$@"; }
body_has()  { grep -q -- "$1" "$BODY"; }
hdr_has()   { grep -qi -- "$1" "$HEADERS"; }
jfield()    { python3 -c 'import json,sys
try:
    d = json.load(open(sys.argv[1]))
except Exception:
    print("")
    raise SystemExit
k = sys.argv[2]
print(d.get(k, ""))' "$BODY" "$1"; }

printf '\n\033[0;36m== A. redirects, TLS, health ==\033[0m\n'
expect 'plain HTTP -> HTTPS redirect' 301 "$(shead "$HTTP/" -H "$H")"
if hdr_has 'location: https://parkzone.in'; then ok 'redirect targets the apex'; else bad 'redirect targets the apex' 'wrong location'; fi
expect 'www -> apex redirect' 301 "$(shead "$BASE/" -H "$HW")"
expect 'nginx self health endpoint' 200 "$(curl -s -o /dev/null -m 5 -w '%{http_code}' "$HTTP/healthz")"

printf '\n\033[0;36m== B. pages: status, content, security headers ==\033[0m\n'
expect 'GET /' 200 "$(shead "$BASE/" -H "$H")"
if body_has 'Indian GPUs for'; then ok 'landing hero served'; else bad 'landing hero served' 'hero copy missing'; fi
if hdr_has 'content-security-policy'; then ok 'Content-Security-Policy present'; else bad 'Content-Security-Policy present' 'missing'; fi
if hdr_has 'strict-transport-security'; then ok 'HSTS present'; else bad 'HSTS present' 'missing'; fi
if hdr_has 'x-frame-options: DENY'; then ok 'X-Frame-Options DENY'; else bad 'X-Frame-Options DENY' 'missing'; fi
if hdr_has 'x-content-type-options: nosniff'; then ok 'X-Content-Type-Options nosniff'; else bad 'X-Content-Type-Options nosniff' 'missing'; fi
if hdr_has 'cache-control: no-cache'; then ok 'HTML is not cached'; else bad 'HTML is not cached' "$(grep -i cache-control "$HEADERS" || echo missing)"; fi

for page in host dashboard terms privacy refund status; do
  expect "GET /$page" 200 "$(sget "$BASE/$page" -H "$H")"
done
if body_has 'Your GPU earns while you sleep'; then ok '/host body sanity'; else bad '/host body sanity' 'hero missing'; fi
if body_has 'Wallet balance'; then ok '/dashboard body sanity'; else bad '/dashboard body sanity' 'wallet missing'; fi
if body_has 'Grievance Officer'; then ok '/refund has the grievance officer'; else bad '/refund has the grievance officer' 'missing'; fi
expect 'unknown path -> 404' 404 "$(sget "$BASE/nope-not-here" -H "$H")"
if body_has 'not parked here'; then ok '404 is our custom page'; else bad '404 is our custom page' 'soft/generic 404'; fi
expect 'secret .env blocked' 403 "$(sget "$BASE/backend.env" -H "$H")"
expect 'hidden .git blocked' 403 "$(sget "$BASE/.git/config" -H "$H")"

printf '\n\033[0;36m== C. assets, caching, compression ==\033[0m\n'
expect 'GET /assets/pz.css' 200 "$(shead "$BASE/assets/pz.css" -H "$H")"
if hdr_has 'cache-control: public, max-age=31536000'; then ok 'CSS cached immutable'; else bad 'CSS cached immutable' "$(grep -i cache-control "$HEADERS")"; fi
if hdr_has 'content-type: text/css'; then ok 'CSS content-type'; else bad 'CSS content-type' "$(grep -i content-type "$HEADERS")"; fi
if curl -sk -o /dev/null -D - -m 15 -H "$H" -H 'Accept-Encoding: gzip' "$BASE/assets/pz.css" | grep -qi 'content-encoding: gzip'; then
  ok 'gzip on CSS' 'gzip'
else
  bad 'gzip on CSS' 'not compressed'
fi
for a in /assets/fonts/inter-latin.woff2 /assets/og.png /assets/icon-512.png /favicon.svg /manifest.webmanifest /robots.txt /sitemap.xml; do
  expect "GET $a" 200 "$(sget "$BASE$a" -H "$H")"
done
if body_has '<urlset'; then ok 'sitemap is valid XML'; else bad 'sitemap is valid XML' 'no urlset'; fi
if body_has 'Sitemap:'; then ok 'robots references sitemap'; else bad 'robots references sitemap' 'missing'; fi

printf '\n\033[0;36m== D. API on the single domain ==\033[0m\n'
expect 'GET /api' 200 "$(shead "$BASE/api" -H "$H")"
if hdr_has 'x-api-version'; then ok 'X-API-Version header' "$(grep -i x-api-version "$HEADERS" | tr -d '\r')"; else bad 'X-API-Version header' 'missing'; fi
expect 'GET /api/health' 200 "$(shead "$BASE/api/health" -H "$H")"
if hdr_has 'x-request-id'; then ok 'X-Request-ID present'; else bad 'X-Request-ID present' 'missing'; fi
if hdr_has 'cache-control: no-store'; then ok 'API not cached' 'no-store'; else bad 'API not cached' "$(grep -i cache-control "$HEADERS")"; fi
if body_has '"db": "up"' || body_has '"db":"up"'; then ok 'health reports db up'; else bad 'health reports db up' "$(cat "$BODY")"; fi
for p in /api/version /api/stats /api/gpus /api/docs /api/openapi.json; do
  expect "GET $p" 200 "$(sget "$BASE$p" -H "$H")"
done
expect 'unknown API route' 404 "$(sget "$BASE/api/nope" -H "$H")"
expect 'out-of-range filter rejected' 422 "$(sget "$BASE/api/gpus?min_vram=999999" -H "$H")"

DJSON=$(curl -s -m 5 "$DIRECT/api/health")
VJSON=$(curl -sk -m 5 -H "$H" "$BASE/api/health")
if [ "$DJSON" = "$VJSON" ]; then ok 'direct body == proxied body' 'identical'; else bad 'direct body == proxied body' "$DJSON vs $VJSON"; fi

printf '\n\033[0;36m== E. full rental lifecycle over the wire ==\033[0m\n'
HOST_ID="PC_CURL$((RANDOM % 9000 + 1000))"
EMAIL="curl$((RANDOM % 9000 + 1000))@parkzone.in"
HB=$(printf '{"host_id":"%s","gpu_model":"%s","vram":24564,"city":"Mumbai","price_per_hour":21,"owner_email":"host@parkzone.in"}' "$HOST_ID" "NVIDIA GeForce RTX 4090")
RENT=$(printf '{"host_id":"%s","renter_email":"%s"}' "$HOST_ID" "$EMAIL")
RENT_BAD_IMG=$(printf '{"host_id":"%s","renter_email":"%s","docker_image":"evil/miner"}' "$HOST_ID" "$EMAIL")
TOPUP=$(printf '{"email":"%s","amount":50000}' "$EMAIL")
BAD_HB='{"host_id":"x"}'

expect 'POST /api/heartbeat' 200 "$(sget "$BASE/api/heartbeat" -X POST -H "$H" -H 'Content-Type: application/json' -d "$HB")"
if body_has "$HOST_ID"; then ok 'host appears in live inventory' "$HOST_ID"; else bad 'host appears in live inventory' 'not found'; fi
expect 'malformed heartbeat rejected' 422 "$(sget "$BASE/api/heartbeat" -X POST -H "$H" -H 'Content-Type: application/json' -d "$BAD_HB")"
expect 'rent with empty wallet' 402 "$(sget "$BASE/api/rent" -X POST -H "$H" -H 'Content-Type: application/json' -d "$RENT")"
expect 'wallet top-up in dev mode' 200 "$(sget "$BASE/api/wallet/add" -X POST -H "$H" -H 'Content-Type: application/json' -d "$TOPUP")"
expect 'image allow-list blocks evil/miner' 422 "$(sget "$BASE/api/rent" -X POST -H "$H" -H 'Content-Type: application/json' -d "$RENT_BAD_IMG")"

IDEM="curl-$HOST_ID"
RENT_IDEM=$(printf '{"host_id":"%s","renter_email":"%s","idempotency_key":"%s"}' "$HOST_ID" "$EMAIL" "$IDEM")
expect 'POST /api/rent' 200 "$(sget "$BASE/api/rent" -X POST -H "$H" -H 'Content-Type: application/json' -d "$RENT_IDEM")"
SSH=$(jfield ssh)
INSTANCE=$(jfield instance_id)
case "$SSH" in
  ssh\ root@parkzone.in\ -p\ 22*) ok 'SSH endpoint on the apex' "$SSH" ;;
  *) bad 'SSH endpoint on the apex' "${SSH:-no ssh field}" ;;
esac
[ -n "$INSTANCE" ] && ok 'instance id returned' "${INSTANCE:0:12}..." || bad 'instance id returned' 'missing'

expect 'replay is idempotent (200)' 200 "$(sget "$BASE/api/rent" -X POST -H "$H" -H 'Content-Type: application/json' -d "$RENT_IDEM")"
SAME=$(jfield instance_id)
if [ "$SAME" = "$INSTANCE" ]; then ok 'replay returns the same instance'; else bad 'replay returns the same instance' "$SAME != $INSTANCE"; fi

expect 'GET /api/jobs' 200 "$(sget "$BASE/api/jobs?host_id=$HOST_ID" -H "$H")"
JOBS=$(python3 -c 'import json,sys;print(len(json.load(open(sys.argv[1])).get("jobs",[])))' "$BODY")
if [ "$JOBS" = "1" ]; then ok 'exactly one job dispatched'; else bad 'exactly one job dispatched' "$JOBS"; fi

JS_RUNNING=$(printf '{"host_id":"%s","instance_id":"%s","status":"running","container_id":"curl123"}' "$HOST_ID" "$INSTANCE")
JS_REPEAT=$(printf '{"host_id":"%s","instance_id":"%s","status":"running"}' "$HOST_ID" "$INSTANCE")
JS_WRONG=$(printf '{"host_id":"%s","instance_id":"%s","status":"failed"}' "PC_WRONG99" "$INSTANCE")
expect 'POST /api/job-status running' 200 "$(sget "$BASE/api/job-status" -X POST -H "$H" -H 'Content-Type: application/json' -d "$JS_RUNNING")"
expect 'another host cannot report on it' 403 "$(sget "$BASE/api/job-status" -X POST -H "$H" -H 'Content-Type: application/json' -d "$JS_WRONG")"
sget "$BASE/api/job-status" -X POST -H "$H" -H 'Content-Type: application/json' -d "$JS_REPEAT" >/dev/null
if body_has 'ignored'; then ok 'repeat report is a no-op (billing clock safe)' 'ignored'; else bad 'repeat report is a no-op (billing clock safe)' "$(cat "$BODY")"; fi

expect 'GET /api/instances' 200 "$(sget "$BASE/api/instances?email=$EMAIL" -H "$H")"
STOP_WRONG=$(printf '{"instance_id":"%s","renter_email":"%s"}' "$INSTANCE" "someone@else.in")
STOP_OK=$(printf '{"instance_id":"%s"}' "$INSTANCE")
expect 'wrong owner cannot stop' 403 "$(sget "$BASE/api/stop" -X POST -H "$H" -H 'Content-Type: application/json' -d "$STOP_WRONG")"
expect 'POST /api/stop' 200 "$(sget "$BASE/api/stop" -X POST -H "$H" -H 'Content-Type: application/json' -d "$STOP_OK")"
CHARGE=$(jfield charged_paise)
if [ -n "$CHARGE" ] && [ "$CHARGE" -le 49 ] 2>/dev/null; then ok 'one minute charged <= 49 paise' "${CHARGE}p"; else bad 'one minute charged <= 49 paise' "${CHARGE:-none}"; fi
BAL=$(jfield balance)
ok 'balance after billing' "${BAL}p"
expect 'double stop rejected' 409 "$(sget "$BASE/api/stop" -X POST -H "$H" -H 'Content-Type: application/json' -d "$STOP_OK")"
expect 'GET /api/ledger' 200 "$(sget "$BASE/api/ledger?email=$EMAIL" -H "$H")"
if body_has 'instance_stopped'; then ok 'ledger recorded the debit'; else bad 'ledger recorded the debit' 'missing'; fi

printf '\n\033[0;36m== F. CORS origin policy ==\033[0m\n'
curl -sk -o /dev/null -D "$HEADERS" -m 10 -X OPTIONS "$BASE/api/gpus" -H "$H" -H 'Origin: https://parkzone.in' -H 'Access-Control-Request-Method: GET'
if hdr_has 'access-control-allow-origin: https://parkzone.in'; then ok 'apex origin allowed'; else bad 'apex origin allowed' 'missing'; fi
curl -sk -o /dev/null -D "$HEADERS" -m 10 -X OPTIONS "$BASE/api/gpus" -H "$H" -H 'Origin: https://evil.example' -H 'Access-Control-Request-Method: GET'
if hdr_has 'access-control-allow-origin'; then bad 'foreign origin rejected' 'ACAO header leaked'; else ok 'foreign origin rejected' 'no ACAO header'; fi

printf '\n\033[0;36m== G. edge rate limiting ==\033[0m\n'
RESULTS=$(for i in $(seq 1 150); do curl -sk -o /dev/null -m 5 -H "$H" "$BASE/api/gpus" -w '%{http_code}\n' & done; wait)
THROTTLED=$(printf '%s' "$RESULTS" | grep -c '429' || true)
if [ "$THROTTLED" -gt 0 ]; then ok 'burst of 150 gets throttled' "$THROTTLED x 429"; else bad 'burst of 150 gets throttled' 'no 429 seen'; fi

printf '\n================================\n'
printf 'curl verification: PASS=%s FAIL=%s\n' "$PASS" "$FAIL"
printf '================================\n'
[ "$FAIL" -eq 0 ] || exit 1
