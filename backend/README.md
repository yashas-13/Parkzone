# ParkZone API (`backend/`)

FastAPI service that powers parkzone.in. One domain, one API surface, no
subdomains ever.

## Layout

| File | Purpose |
|---|---|
| `main.py` | All HTTP routes, validation, logging, rate limiting |
| `db.py` | MongoDB layer: pooling, indexes, atomic counters, ledger |
| `agent.py` | Windows host agent (heartbeat + docker job runner) |
| `requirements.txt` | Pinned runtime deps |
| `requirements-dev.txt` | Test/dev deps (mongomock, pytest, httpx) |
| `requirements-prod-extras.txt` | Optional uvloop/httptools/gunicorn for the VPS |

The old SQLAlchemy models were retired when the store moved to MongoDB; the
original file is kept at `../_archive/models.v1.sqlalchemy.py` for reference only.

## Routes (all under `/api`)

| Method | Path | Notes |
|---|---|---|
| GET | `/api` | Service metadata |
| GET | `/api/health` | DB-pinging readiness probe, 503 when Mongo is down |
| GET | `/api/version` | Build + config fingerprint |
| GET | `/api/stats` | Public marketplace telemetry for the landing page |
| GET | `/api/gpus` | Live inventory (`city`, `min_vram`, `max_price` filters) |
| POST | `/api/heartbeat` | Host check-in, refreshes the liveness TTL |
| GET | `/api/jobs` | One-shot dispatch of rentals to a host agent |
| POST | `/api/rent` | Create an instance (idempotent via `idempotency_key`) |
| POST | `/api/stop` | Stop + bill per started minute, floors at zero |
| GET | `/api/wallet` | Balance in paise |
| POST | `/api/wallet/add` | Admin/webhook only when `PZ_DEV_MODE=false` |
| GET | `/api/instances` | Renter's instances |
| GET | `/api/ledger` | Immutable credit/debit audit trail |
| GET | `/api/docs` | Swagger UI |

## Local development

```bash
pip install -r requirements-dev.txt
uvicorn main:app --host 127.0.0.1 --port 8080    # no MONGO_URI -> in-memory mongomock
pytest -q                                        # 33 contract tests
bash ../tests/smoke.sh                           # 29 live HTTP checks
```

The API listens on loopback only in production; nginx terminates TLS.
