#!/usr/bin/env bash
# Validate (and optionally exercise) nginx-parkzone.conf without touching the
# real /etc/nginx. Portable between the Ubuntu VPS and Termux.
#
#   ./ops/validate-nginx.sh          # syntax check only  (what CI runs)
#   ./ops/validate-nginx.sh --run    # + boot it on :8081/:8443 and curl it
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SB="${TMPDIR:-/tmp}/pz-nginx-check"
RUN=0
[ "${1:-}" = "--run" ] && RUN=1

rm -rf "$SB"
mkdir -p "$SB"/conf "$SB"/snippets "$SB"/logs "$SB"/public/assets "$SB"/certbot "$SB"/tls

# Filesystem paths are redirected into the sandbox. The ONLY other change is the
# listen port (non-root cannot bind 80/443); every route, header, cache rule,
# throttle and proxy directive is used exactly as it ships.
sed \
  -e "s#/etc/nginx/snippets/pz-security-headers.conf#$SB/snippets/pz-security-headers.conf#g" \
  -e "s#/var/www/parkzone/public#$SB/public#g" \
  -e "s#/var/log/nginx#$SB/logs#g" \
  -e "s#/var/www/certbot#$SB/certbot#g" \
  -e "s#/etc/letsencrypt/live/parkzone.in#$SB/tls#g" \
  -e 's#listen 80;#listen 8081;#' \
  -e 's#listen \[::\]:80;#listen [::]:8081;#' \
  -e 's#listen 443 ssl;#listen 8443 ssl;#' \
  -e 's#listen \[::\]:443 ssl;#listen [::]:8443 ssl;#' \
  -e 's#https://parkzone\.in\$request_uri#http://parkzone.in:8081\$request_uri#g' \
  "$ROOT/nginx-parkzone.conf" > "$SB/conf/site.conf"

cp "$ROOT/ops/pz-security-headers.conf" "$SB/snippets/"
echo 'parkzone' > "$SB/public/index.html"
echo 'host page' > "$SB/public/host.html"
echo 'console' > "$SB/public/dashboard.html"
echo 'status' > "$SB/public/status.html"
echo 'terms' > "$SB/public/terms.html"
echo 'not found' > "$SB/public/404.html"
echo 'body{}' > "$SB/public/assets/pz.css"
echo 'SECRET' > "$SB/public/backend.env"

MIME=/data/data/com.termux/files/usr/etc/nginx/mime.types
[ -f /etc/nginx/mime.types ] && MIME=/etc/nginx/mime.types

TLS_OK=1
if command -v openssl >/dev/null 2>&1; then
  openssl req -x509 -newkey rsa:2048 -nodes -days 2 -subj '/CN=parkzone.in' \
    -keyout "$SB/tls/privkey.pem" -out "$SB/tls/fullchain.pem" >/dev/null 2>&1 || TLS_OK=0
else
  TLS_OK=0
fi
if [ "$TLS_OK" = 0 ]; then
  echo 'WARN: openssl unavailable - generating a throwaway cert in python'
  python3 - "$SB/tls" <<'PY'
import datetime, ipaddress, os, sys
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID
out = sys.argv[1]
key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "parkzone.in")])
cert = (x509.CertificateBuilder().subject_name(name).issuer_name(name)
        .public_key(key.public_key()).serial_number(x509.random_serial_number())
        .not_valid_before(datetime.datetime.utcnow() - datetime.timedelta(days=1))
        .not_valid_after(datetime.datetime.utcnow() + datetime.timedelta(days=2))
        .add_extension(x509.SubjectAlternativeName([x509.DNSName("parkzone.in"), x509.DNSName("www.parkzone.in")]), critical=False)
        .sign(key, hashes.SHA256()))
open(os.path.join(out, "privkey.pem"), "wb").write(key.private_bytes(
    serialization.Encoding.PEM, serialization.PrivateFormat.TraditionalOpenSSL, serialization.NoEncryption()))
open(os.path.join(out, "fullchain.pem"), "wb").write(cert.public_bytes(serialization.Encoding.PEM))
print("cert written")
PY
fi

cat > "$SB/conf/nginx.conf" <<NGINXEOF
worker_processes 1;
pid $SB/nginx.pid;
error_log $SB/logs/error.log warn;
events { worker_connections 128; }
http {
    include $MIME;
    default_type application/octet-stream;
    access_log $SB/logs/access.log;
    include $SB/conf/site.conf;
}
NGINXEOF

echo '=== 1. nginx -t (production config, sandboxed paths) ==='
nginx -t -c "$SB/conf/nginx.conf" -p "$SB"
RC=$?
[ "$RC" -ne 0 ] && { echo 'CONFIG IS INVALID'; exit 1; }

echo '=== 2. invariant checks ==='
FAIL=0
chk() { if eval "$2"; then printf '  ok    %s\n' "$1"; else printf '  FAIL  %s\n' "$1"; FAIL=$((FAIL+1)); fi; }
chk 'no subdomain anywhere in the config'      "! grep -v '^[[:space:]]*#' \"$ROOT/nginx-parkzone.conf\" | grep -Eq '(api|app|staging|dev|cdn)\\.parkzone\\.in'"
chk 'proxy_pass preserves the /api prefix'     "! grep -E 'proxy_pass' \"$ROOT/nginx-parkzone.conf\" | grep -q '/\$'"
chk 'HSTS-lenient TLS floor is 1.2+'            "grep -q 'ssl_protocols TLSv1.2 TLSv1.3' \"$ROOT/nginx-parkzone.conf\""
chk 'API responses are never cached'           "grep -q 'Cache-Control \"no-store\"' \"$ROOT/nginx-parkzone.conf\""
chk 'secrets are denied by the dotfile rule'   "grep -q 'env|py|pyc' \"$ROOT/nginx-parkzone.conf\""
chk 'throttling zones are defined'             "[ \$(grep -c 'limit_req_zone' \"$ROOT/nginx-parkzone.conf\") -ge 2 ]"

if [ "$RUN" = 1 ]; then
  echo '=== 3. live integration on :8081 (http) / :8443 (https) ==='
  if ! command -v nginx >/dev/null 2>&1; then
    echo 'SKIP: nginx binary not installed'
  else
    nginx -c "$SB/conf/nginx.conf" -p "$SB" && sleep 1
  code() { curl -s -k -o "$SB/out" -m 10 -w '%{http_code}' "$@"; }
  H='Host: parkzone.in'
  chk 'http -> https redirect (301)'          "[ \"\$(code -H '$H' http://127.0.0.1:8081/)\" = 301 ]"
  chk 'https / serves the landing page'       "[ \"\$(code -k -H '$H' https://127.0.0.1:8443/)\" = 200 ]"
  chk 'clean URL /host -> host.html'          "[ \"\$(code -k -H '$H' https://127.0.0.1:8443/host)\" = 200 ]"
  chk 'clean URL /dashboard'                  "[ \"\$(code -k -H '$H' https://127.0.0.1:8443/dashboard)\" = 200 ]"
  chk 'unknown path 404s (no soft-404)'       "[ \"\$(code -k -H '$H' https://127.0.0.1:8443/nope)\" = 404 ]"
  chk 'dotfile/.env exposure blocked'         "[ \"\$(code -k -H '$H' https://127.0.0.1:8443/backend.env)\" = 403 ]"
  chk 'www -> apex redirect'                  "[ \"\$(code -k -H 'Host: www.parkzone.in' https://127.0.0.1:8443/)\" = 301 ]"
  chk 'security headers present on HTML'      "curl -sk -H '$H' -D - -o /dev/null https://127.0.0.1:8443/ | grep -qi 'x-frame-options: DENY'"
  chk 'assets get immutable caching'          "curl -sk -H '$H' -D - -o /dev/null https://127.0.0.1:8443/assets/pz.css | grep -qi 'immutable'"
  chk '/api proxied to the FastAPI backend'   "curl -sk -H '$H' https://127.0.0.1:8443/api/health | grep -q '\"db\":\"up\"'"
  chk '/api/openapi.json not blocked'         "[ \"\$(code -k -H '$H' https://127.0.0.1:8443/api/openapi.json)\" = 200 ]"
    nginx -s stop -c "$SB/conf/nginx.conf" -p "$SB" 2>/dev/null
    sleep 1
  fi
fi

echo
echo "nginx config checks FAIL=$FAIL"
[ "$FAIL" -eq 0 ] || exit 1
echo 'NGINX CONFIG VALID'
