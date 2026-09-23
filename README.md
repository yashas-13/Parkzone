# ParkZone - parkzone.in

India's GPU parking marketplace. Hosts park idle gaming GPUs, renters rent them
by the minute. One domain, one API surface, INR billing via UPI.

> **SINGLE DOMAIN RULE.** Everything lives on `parkzone.in` - landing, host page,
> console, `/api/*`, and the agent download. Never `api.parkzone.in`,
> `app.parkzone.in`, `www` content, or a staging subdomain. `ops/validate-nginx.sh`
> fails the build if a subdomain ever appears in the nginx config.

## Repository map

```
parkzone/
├── backend/                 FastAPI service (see backend/README.md)
│   ├── main.py              routes, validation, throttling, JSON logs
│   ├── db.py                MongoDB layer (pooling, indexes, counters, ledger)
│   ├── agent.py             Windows host agent
│   └── requirements*.txt    pinned deps (runtime / dev / prod extras)
├── public/                  static site served by nginx
│   ├── index.html           landing + live marketplace
│   ├── host.html            Host & Earn + earnings calculator
│   ├── dashboard.html       renter console
│   ├── 404.html             hard 404 page
│   └── assets/              design system, site JS, icons, OG image
├── nginx-parkzone.conf      the only nginx site file (one domain)
├── ops/                     deploy, systemd, backups, validators, logrotate
├── tests/                   pytest contract suite + live HTTP smoke test
└── _archive/                retired v1 files, kept for reference only
```

## Local development

```bash
cd backend
pip install -r requirements-dev.txt
uvicorn main:app --host 127.0.0.1 --port 8080      # no MONGO_URI -> in-memory mongomock

cd ..
python3 -m pytest tests -q                         # 33 API contract tests
bash tests/smoke.sh                                # 29 live HTTP checks
bash ops/validate-nginx.sh --run                   # nginx syntax + routing integration
```

Serve the static site locally with `python3 -m http.server 8000 -d public`
(the API prefix `/api` is expected to be proxied by nginx; in local dev point the
frontend at `http://127.0.0.1:8080/api` via the `PZ_API_BASE` meta tag).

## Production deploy (Ubuntu 22.04 VPS)

```bash
# 1. one-time host prep
sudo apt update && sudo apt install -y nginx python3-venv python3-pip certbot python3-certbot-nginx logrotate
sudo mkdir -p /var/www/parkzone /var/www/certbot

# 2. ship the app (tarball or git, never rsync the .env)
tar xzf parkzone-release.tar.gz -C /tmp && sudo cp -r /tmp/parkzone/* /var/www/parkzone/
sudo python3 -m venv /var/www/parkzone/.venv
sudo /var/www/parkzone/.venv/bin/pip install -r /var/www/parkzone/backend/requirements.txt
sudo /var/www/parkzone/.venv/bin/pip install -r /var/www/parkzone/backend/requirements-prod-extras.txt

# 3. secrets: create /var/www/parkzone/backend/.env from .env.example (chmod 600)
#    PZ_DEV_MODE=false, real MONGO_URI (least-privilege app user), PZ_ADMIN_TOKEN

# 4. nginx
sudo cp ops/pz-security-headers.conf /etc/nginx/snippets/pz-security-headers.conf
sudo cp nginx-parkzone.conf /etc/nginx/sites-available/parkzone
sudo ln -sf /etc/nginx/sites-available/parkzone /etc/nginx/sites-enabled/parkzone
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d parkzone.in -d www.parkzone.in

# 5. the API as a service
sudo cp ops/parkzone-api.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now parkzone-api

# 6. verify
bash tests/smoke.sh https://parkzone.in
```

Subsequent releases: `sudo bash ops/deploy.sh` (health-checked, auto-rollback).

## Security posture

- Secrets live only in `backend/.env` (0600) or the systemd `EnvironmentFile`; `.env` is git-ignored.
- `POST /api/wallet/add` is a demo endpoint in dev mode and requires `X-Admin-Token`
  as soon as `PZ_DEV_MODE=false` - it is meant for the Razorpay webhook, never a browser.
- Docker images renters may deploy are allow-listed (`PZ_ALLOWED_IMAGES`).
- Every request is idempotency-aware where money moves (`RentReq`, `WalletAdd`).
- Rate limiting exists twice: in-process token buckets and nginx `limit_req`/
  `limit_conn` at the edge.
- Money is integers in paise. Charges floor at zero; balances never go negative.
- All credits and debits are appended to an immutable `transactions` ledger.
- `GET /api/health` pings Mongo and returns 503 when the database is unreachable.
