"""ParkZone API - the only backend behind parkzone.in.

Contract with nginx (see ../nginx-parkzone.conf):
    parkzone.in/api/<x>  ->  http://127.0.0.1:8080/api/<x>
The /api prefix is PRESERVED (nginx must proxy without a trailing slash), so
routes are declared with the prefix here and work identically on :8080 and
through the proxy. SINGLE DOMAIN RULE: parkzone.in only, never a subdomain.
"""
from __future__ import annotations

import json
import logging
import math
import os
import re
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from threading import Lock
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator

import db as store

load_dotenv()

API_VERSION = "2.0.0"


def _env(name: str, default: str = "") -> str:
    return (os.environ.get(name, default) or "").strip()


DOMAIN = _env("PARKZONE_DOMAIN", "parkzone.in")
DEV_MODE = _env("PZ_DEV_MODE", "true").lower() in {"1", "true", "yes", "on"}
ADMIN_TOKEN = _env("PZ_ADMIN_TOKEN", "")
CORS_ORIGINS = [o.strip() for o in _env("PZ_CORS_ORIGINS", f"https://{DOMAIN}").split(",") if o.strip()]
ALLOWED_IMAGES = [
    i.strip()
    for i in _env(
        "PZ_ALLOWED_IMAGES",
        "pytorch/pytorch,tensorflow/tensorflow:latest-gpu,nvidia/cuda:12.1.0-base-ubuntu22.04",
    ).split(",")
    if i.strip()
]
SSH_PORT_BASE = int(_env("PZ_SSH_PORT_BASE", "22001"))
JUPYTER_PORT_BASE = int(_env("PZ_JUPYTER_PORT_BASE", "8901"))
MIN_CREDIT_MINUTES = int(_env("PZ_MIN_CREDIT_MINUTES", "10"))
MARKUP = float(_env("PZ_MARKUP", "1.38"))
LOG_LEVEL = _env("PZ_LOG_LEVEL", "INFO").upper()
WALLET_MIN_PAISE = 500          # Rs 5
WALLET_MAX_PAISE = 10_000_000   # Rs 1,00,000

if DEV_MODE:
    for extra in ("http://localhost:8000", "http://127.0.0.1:8000"):
        if extra not in CORS_ORIGINS:
            CORS_ORIGINS.append(extra)

HOST_ID_RE = re.compile(r"^[A-Za-z0-9_-]{4,64}$")
EMAIL_RE = re.compile(r"^[^@\s]{1,64}@[A-Za-z0-9]([A-Za-z0-9.-]{0,188})[A-Za-z0-9]\.[A-Za-z]{2,24}$")


class _JsonFormatter(logging.Formatter):
    """One JSON object per line - friendly to journald, Loki and CloudWatch."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z"),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        reserved = set(logging.LogRecord("", 0, "", 0, "", None, None).__dict__) | {"message", "asctime"}
        for key, value in record.__dict__.items():
            if key in reserved or key.startswith("_"):
                continue
            if isinstance(value, (str, int, float, bool)) or value is None:
                payload[key] = value
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


_handler = logging.StreamHandler()
_handler.setFormatter(_JsonFormatter())
logging.basicConfig(level=getattr(logging, LOG_LEVEL, logging.INFO), handlers=[_handler], force=True)
log = logging.getLogger("parkzone.api")
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


@asynccontextmanager
async def lifespan(app: FastAPI):
    store.get_db()
    swept = store.sweep_stale_hosts()
    log.info("startup complete", extra={"stale_hosts_swept": swept, "dev_mode": DEV_MODE, "version": API_VERSION})
    if DEV_MODE:
        log.warning("PZ_DEV_MODE is on - demo wallet credits and open CORS are enabled")
    yield
    client = getattr(store, "_client", None)
    if client is not None:
        try:
            client.close()
        except Exception:  # pragma: no cover
            pass


app = FastAPI(
    title="ParkZone API",
    version=API_VERSION,
    lifespan=lifespan,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    redoc_url=None,
)

_RATE_HITS: dict = {}
_RATE_LOCK = Lock()
_RATE_WINDOW = 60.0
_RATE_READ_PER_MIN = int(_env("PZ_RATE_READ_PER_MIN", "300"))
_RATE_WRITE_PER_MIN = int(_env("PZ_RATE_WRITE_PER_MIN", "60"))
_SWEEP_LOCK = Lock()
_last_sweep = [0.0]


def _allow(ip: str, limit: int) -> bool:
    """Cheap in-process token bucket. nginx limit_req is the real edge guard."""
    now = time.monotonic()
    with _RATE_LOCK:
        hits = _RATE_HITS.setdefault(ip, [])
        cutoff = now - _RATE_WINDOW
        while hits and hits[0] < cutoff:
            hits.pop(0)
        if len(_RATE_HITS) > 5000:  # bound memory under a flood
            for key in [k for k, v in _RATE_HITS.items() if not v or v[-1] < cutoff]:
                _RATE_HITS.pop(key, None)
        if len(hits) >= limit:
            return False
        hits.append(now)
        return True


def _maybe_sweep() -> None:
    """Expire stale hosts at most once every 10s instead of on every request."""
    with _SWEEP_LOCK:
        if time.monotonic() - _last_sweep[0] < 10.0:
            return
        _last_sweep[0] = time.monotonic()
    try:
        store.sweep_stale_hosts()
    except Exception:
        log.warning("stale host sweep failed", exc_info=True)


@app.middleware("http")
async def observe_and_throttle(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or uuid.uuid4().hex[:16]
    client = request.client.host if request.client else "unknown"
    write = request.method in {"POST", "PUT", "PATCH", "DELETE"}
    if not _allow(client, _RATE_WRITE_PER_MIN if write else _RATE_READ_PER_MIN):
        return JSONResponse(
            {"detail": "too many requests"},
            status_code=429,
            headers={"Retry-After": "60", "X-Request-ID": request_id},
        )
    started = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        log.exception(
            "unhandled error",
            extra={"request_id": request_id, "path": request.url.path, "client": client},
        )
        return JSONResponse(
            {"detail": "internal server error", "request_id": request_id},
            status_code=500,
            headers={"X-Request-ID": request_id},
        )
    duration = round((time.perf_counter() - started) * 1000, 2)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-API-Version"] = API_VERSION
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    log.info(
        "request",
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "duration_ms": duration,
            "client": client,
        },
    )
    return response


# Added last so it is the outermost layer: even 429/500 responses carry CORS headers.
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-Admin-Token", "X-Request-Id", "Idempotency-Key"],
    allow_credentials=False,
)


# --------------------------------------------------------------------------- #
# Request models - every field is bounded so a bad actor cannot poison the DB  #
# --------------------------------------------------------------------------- #
def _clean_text(value: str) -> str:
    return re.sub(r"[<>\r\n\t]", "", value or "").strip()


def _clean_email(value: str) -> str:
    value = (value or "").strip().lower()
    if not EMAIL_RE.match(value):
        raise ValueError("a valid email address is required")
    return value


class Heartbeat(BaseModel):
    host_id: str = Field(min_length=4, max_length=64)
    gpu_model: str = Field(default="Unknown GPU", max_length=96)
    vram: int = Field(default=0, ge=0, le=196608)
    city: str = Field(default="Mumbai", max_length=48)
    price_per_hour: int = Field(default=21, ge=1, le=500)
    owner_email: str = Field(default="", max_length=254)

    @field_validator("host_id")
    @classmethod
    def _host_id(cls, v: str) -> str:
        v = v.strip()
        if not HOST_ID_RE.match(v):
            raise ValueError("host_id must be 4-64 chars of [A-Za-z0-9_-]")
        return v

    @field_validator("gpu_model", "city")
    @classmethod
    def _text(cls, v: str) -> str:
        return _clean_text(v)

    @field_validator("owner_email")
    @classmethod
    def _email(cls, v: str) -> str:
        return _clean_email(v) if v else ""


class RentReq(BaseModel):
    host_id: str = Field(min_length=4, max_length=64)
    renter_email: str = Field(max_length=254)
    docker_image: str = Field(default="pytorch/pytorch", max_length=128)
    idempotency_key: Optional[str] = Field(default=None, max_length=64)

    @field_validator("host_id")
    @classmethod
    def _host_id(cls, v: str) -> str:
        v = v.strip()
        if not HOST_ID_RE.match(v):
            raise ValueError("invalid host_id")
        return v

    @field_validator("renter_email")
    @classmethod
    def _email(cls, v: str) -> str:
        return _clean_email(v)

    @field_validator("docker_image")
    @classmethod
    def _image(cls, v: str) -> str:
        v = v.strip()
        if v not in ALLOWED_IMAGES:
            raise ValueError("docker image is not on the allowlist")
        return v

    @field_validator("idempotency_key")
    @classmethod
    def _key(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        return v if re.match(r"^[A-Za-z0-9_-]{8,64}$", v) else None


class StopReq(BaseModel):
    instance_id: str = Field(min_length=8, max_length=64)
    renter_email: Optional[str] = Field(default=None, max_length=254)

    @field_validator("renter_email")
    @classmethod
    def _email(cls, v: Optional[str]) -> Optional[str]:
        return _clean_email(v) if v else None


class WalletAdd(BaseModel):
    email: str = Field(max_length=254)
    amount: int = Field(ge=WALLET_MIN_PAISE, le=WALLET_MAX_PAISE)
    idempotency_key: Optional[str] = Field(default=None, max_length=64)

    @field_validator("email")
    @classmethod
    def _email(cls, v: str) -> str:
        return _clean_email(v)

    @field_validator("idempotency_key")
    @classmethod
    def _key(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        return v if re.match(r"^[A-Za-z0-9_-]{8,64}$", v) else None


# --------------------------------------------------------------------------- #
# Guard + serialisers                                                        #
# --------------------------------------------------------------------------- #
def require_admin(x_admin_token: Optional[str] = Header(default=None)) -> None:
    """Demo credits are only reachable in dev mode or with the webhook secret."""
    if DEV_MODE:
        return
    if not ADMIN_TOKEN or x_admin_token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="admin token required for this endpoint")


def display_price_for(host_price: int) -> int:
    return int(math.ceil(host_price * MARKUP))


def _instance_payload(row) -> dict:
    port = row.get("ssh_port")
    jup = row.get("jupyter_port")
    return {
        "instance_id": str(row["_id"]),
        "host_id": row.get("host_id"),
        "ssh_port": port,
        "jupyter_port": jup,
        "status": row.get("status"),
        "docker_image": row.get("docker_image"),
        "started_at": store.as_utc(row.get("start_time")).isoformat() if row.get("start_time") else None,
        "cost_per_minute": row.get("cost_per_minute", 0),
        "ssh": f"ssh root@{DOMAIN} -p {port}",
        "jupyter": f"https://{DOMAIN}:{jup}",
    }


def _host_payload(row) -> dict:
    return {
        "host_id": row.get("host_id"),
        "gpu_model": row.get("gpu_model"),
        "vram": row.get("vram", 0),
        "city": row.get("city"),
        "display_price": row.get("display_price"),
        "uptime": round(float(row.get("uptime_percent", 100.0)), 1),
        "last_heartbeat": store.as_utc(row.get("last_heartbeat")).isoformat() if row.get("last_heartbeat") else None,
    }


def _live_hosts() -> list:
    """Hosts that are online and whose heartbeat is inside the TTL window."""
    _maybe_sweep()
    cutoff = store.heartbeat_cutoff()
    out = []
    for row in store.get_db().hosts.find({"status": "online"}):
        hb = store.as_utc(row.get("last_heartbeat"))
        if hb is None or hb < cutoff:
            continue
        out.append(row)
    return out


# --------------------------------------------------------------------------- #
# Routes - all under /api (nginx preserves the prefix)                        #
# --------------------------------------------------------------------------- #
@app.get("/api")
def api_root():
    return {
        "service": "parkzone-api",
        "version": API_VERSION,
        "domain": DOMAIN,
        "docs": "/api/docs",
        "single_domain": True,
    }


@app.get("/")
def root():
    """Direct hits on :8080 are a misconfiguration - point people at the site."""
    return {"service": "parkzone-api", "site": f"https://{DOMAIN}", "api": "/api"}


@app.get("/api/health")
def health():
    """Liveness + readiness in one probe. 503 means: do not send traffic."""
    try:
        store.ping()
    except Exception:
        log.error("health check failed", exc_info=True)
        raise HTTPException(status_code=503, detail="database unavailable")
    return {"ok": True, "version": API_VERSION, "db": "up", "dev_mode": DEV_MODE}


@app.get("/api/version")
def version():
    return {"version": API_VERSION, "domain": DOMAIN, "dev_mode": DEV_MODE, "markup": MARKUP}


@app.get("/api/stats")
def stats():
    """Public telemetry that powers the landing page counters."""
    hosts = _live_hosts()
    prices = [int(h.get("display_price") or 0) for h in hosts if h.get("display_price")]
    cities = sorted({h.get("city") or "Unknown" for h in hosts})
    vram = sum(int(h.get("vram") or 0) for h in hosts)
    uptimes = [float(h.get("uptime_percent") or 0) for h in hosts]
    return {
        "gpus_online": len(hosts),
        "cities": cities,
        "total_vram_mb": vram,
        "min_price": min(prices) if prices else None,
        "max_price": max(prices) if prices else None,
        "avg_price": round(sum(prices) / len(prices), 1) if prices else None,
        "avg_uptime": round(sum(uptimes) / len(uptimes), 1) if uptimes else None,
        "aws_4090_price": 98,
        "generated_at": store.now_utc().isoformat(),
    }


@app.get("/api/gpus")
def list_gpus(city: Optional[str] = None, min_vram: int = 0, max_price: Optional[int] = None):
    """Live marketplace inventory: online hosts with a fresh heartbeat."""
    if min_vram < 0 or min_vram > 196608:
        raise HTTPException(422, "min_vram out of range")
    if max_price is not None and (max_price < 1 or max_price > 100000):
        raise HTTPException(422, "max_price out of range")
    rows = [_host_payload(h) for h in _live_hosts()]
    if city:
        wanted = city.strip().lower()
        rows = [r for r in rows if (r.get("city") or "").lower() == wanted]
    if min_vram:
        rows = [r for r in rows if int(r.get("vram") or 0) >= min_vram]
    if max_price is not None:
        rows = [r for r in rows if int(r.get("display_price") or 0) <= max_price]
    rows.sort(key=lambda r: int(r.get("display_price") or 0))
    return rows


@app.post("/api/heartbeat")
def heartbeat(hb: Heartbeat):
    """Host agent check-in. Upserts the host and refreshes the liveness TTL."""
    db = store.get_db()
    now = store.now_utc()
    update = {
        "$set": {
            "host_id": hb.host_id,
            "gpu_model": hb.gpu_model or "Unknown GPU",
            "vram": hb.vram,
            "city": hb.city or "Mumbai",
            "price_per_hour": hb.price_per_hour,
            "display_price": display_price_for(hb.price_per_hour),
            "owner_email": hb.owner_email,
            "status": "online",
            "last_heartbeat": now,
        },
        "$setOnInsert": {
            "uptime_percent": 100.0,
            "created_at": now,
        },
        # $inc creates the field on insert; combining it with $setOnInsert on the
        # same path is a hard MongoDB conflict error, hence kept separate.
        "$inc": {"total_heartbeats": 1},
    }
    db.hosts.update_one({"host_id": hb.host_id}, update, upsert=True)
    return {"status": "ok", "server_time": now.isoformat(), "host_ttl_seconds": store.HOST_TTL_SECONDS}


@app.get("/api/jobs")
def poll_jobs(host_id: str):
    """Host agent polls for rentals it must provision. One-shot dispatch."""
    if not HOST_ID_RE.match((host_id or "").strip()):
        raise HTTPException(422, "invalid host_id")
    db = store.get_db()
    jobs = []
    for row in list(db.instances.find({"host_id": host_id, "status": "provisioning"}).limit(5)):
        claimed = db.instances.update_one(
            {"_id": row["_id"], "status": "provisioning"},
            {"$set": {"status": "starting", "dispatched_at": store.now_utc()}},
        )
        if not claimed.modified_count:
            continue
        jobs.append(
            {
                "instance_id": str(row["_id"]),
                "ssh_port": row.get("ssh_port"),
                "jupyter_port": row.get("jupyter_port"),
                "docker_image": row.get("docker_image", "pytorch/pytorch"),
            }
        )
    return {"jobs": jobs}


@app.post("/api/rent")
def rent(req: RentReq):
    """Create an instance. Idempotent when idempotency_key is supplied."""
    db = store.get_db()
    _maybe_sweep()
    host = db.hosts.find_one({"host_id": req.host_id})
    if not host:
        raise HTTPException(404, "host not found")
    hb_at = store.as_utc(host.get("last_heartbeat"))
    if host.get("status") != "online" or hb_at is None or hb_at < store.heartbeat_cutoff():
        raise HTTPException(409, "that host just went offline - pick another GPU")
    if req.idempotency_key:
        existing = db.instances.find_one(
            {"idempotency_key": req.idempotency_key, "renter_email": req.renter_email}
        )
        if existing:
            return _instance_payload(existing)
    host_price = int(host.get("price_per_hour") or 21)
    display_price = int(host.get("display_price") or display_price_for(host_price))
    cpm = int(math.ceil(display_price * 100 / 60))
    user = db.users.find_one({"email": req.renter_email})
    if not user:
        db.users.insert_one(
            {
                "email": req.renter_email,
                "password_hash": "",
                "wallet_balance": 0,
                "role": "renter",
                "created_at": store.now_utc(),
            }
        )
        user = {"wallet_balance": 0}
    balance = int(user.get("wallet_balance") or 0)
    hold = cpm * MIN_CREDIT_MINUTES
    if balance < hold:
        short = math.ceil((hold - balance) / 100)
        raise HTTPException(402, f"insufficient balance - add about Rs {short} to start this instance")
    ssh_port = store.next_sequence("ssh_port", SSH_PORT_BASE)
    jup_port = store.next_sequence("jupyter_port", JUPYTER_PORT_BASE)
    now = store.now_utc()
    doc = {
        "host_id": req.host_id,
        "renter_email": req.renter_email,
        "ssh_port": ssh_port,
        "jupyter_port": jup_port,
        "status": "provisioning",
        "start_time": now,
        "docker_container_id": "",
        "cost_per_minute": cpm,
        "docker_image": req.docker_image,
        "idempotency_key": req.idempotency_key,
        "created_at": now,
    }
    inserted = db.instances.insert_one(doc)
    doc["_id"] = inserted.inserted_id
    store.record_txn(
        req.renter_email,
        "instance_created",
        0,
        instance_id=str(inserted.inserted_id),
        host_id=req.host_id,
        note=f"credit hold required Rs {hold / 100:.2f}",
    )
    log.info(
        "instance created",
        extra={"path": "/api/rent", "client": req.host_id, "status": 200},
    )
    return _instance_payload(doc)


@app.post("/api/stop")
def stop(req: StopReq):
    """Stop an instance, bill per started minute, never below a zero balance."""
    from bson import ObjectId
    from bson.errors import InvalidId

    db = store.get_db()
    try:
        oid = ObjectId(req.instance_id)
    except (InvalidId, TypeError):
        raise HTTPException(404, "instance not found")
    inst = db.instances.find_one({"_id": oid})
    if not inst:
        raise HTTPException(404, "instance not found")
    if req.renter_email and inst.get("renter_email") != req.renter_email:
        raise HTTPException(403, "this instance belongs to another account")
    if inst.get("status") not in {"running", "starting", "provisioning"}:
        raise HTTPException(409, f"instance is already {inst.get('status')}")
    now = store.now_utc()
    started = store.as_utc(inst.get("start_time")) or now
    minutes = max(1, int(math.ceil((now - started).total_seconds() / 60)))
    cost = minutes * int(inst.get("cost_per_minute") or 0)
    charged = cost
    debit = db.users.update_one(
        {"email": inst["renter_email"], "wallet_balance": {"$gte": cost}},
        {"$inc": {"wallet_balance": -cost}},
    )
    if not debit.modified_count:
        # Balance exhausted mid-session: drain to zero instead of going negative.
        current = db.users.find_one({"email": inst["renter_email"]}) or {}
        charged = min(cost, int(current.get("wallet_balance") or 0))
        db.users.update_one({"email": inst["renter_email"]}, {"$set": {"wallet_balance": 0}})
    db.instances.update_one(
        {"_id": oid},
        {"$set": {"status": "stopped", "stopped_at": now, "charged_paise": charged, "minutes": minutes}},
    )
    store.record_txn(
        inst["renter_email"],
        "instance_stopped",
        -charged,
        instance_id=str(oid),
        host_id=inst.get("host_id"),
        note=f"{minutes} min at Rs {inst.get('cost_per_minute', 0) / 100:.4f}/min",
    )
    remaining = db.users.find_one({"email": inst["renter_email"]}) or {}
    return {
        "status": "stopped",
        "minutes": minutes,
        "charged_paise": charged,
        "balance": int(remaining.get("wallet_balance") or 0),
    }


@app.get("/api/wallet")
def wallet(email: str):
    db = store.get_db()
    try:
        email = _clean_email(email)
    except ValueError as exc:
        raise HTTPException(422, str(exc))
    user = db.users.find_one({"email": email})
    return {
        "email": email,
        "balance": int((user or {}).get("wallet_balance") or 0),
        "currency": "INR",
        "hold_minutes": MIN_CREDIT_MINUTES,
    }


@app.post("/api/wallet/add", dependencies=[Depends(require_admin)])
def wallet_add(w: WalletAdd):
    """Credit a wallet. DEV_MODE demo top-up, or the Razorpay webhook in prod.

    In production this endpoint requires the X-Admin-Token header and is only
    called by the payment webhook - never by the browser.
    """
    from pymongo.errors import DuplicateKeyError

    db = store.get_db()
    if w.idempotency_key:
        seen = db.transactions.find_one({"idempotency_key": w.idempotency_key})
        if seen:
            user = db.users.find_one({"email": w.email}) or {}
            return {"email": w.email, "balance": int(user.get("wallet_balance") or 0), "replayed": True}
    db.users.update_one(
        {"email": w.email},
        {
            "$setOnInsert": {"password_hash": "", "role": "renter", "created_at": store.now_utc()},
            "$inc": {"wallet_balance": w.amount},
        },
        upsert=True,
    )
    try:
        store.record_txn(
            w.email,
            "topup",
            w.amount,
            idempotency_key=w.idempotency_key,
            note="demo credit" if DEV_MODE else "payment webhook",
        )
    except DuplicateKeyError:
        pass  # concurrent retry already recorded this credit
    user = db.users.find_one({"email": w.email}) or {}
    return {"email": w.email, "balance": int(user.get("wallet_balance") or 0)}


@app.get("/api/instances")
def my_instances(email: str):
    db = store.get_db()
    try:
        email = _clean_email(email)
    except ValueError as exc:
        raise HTTPException(422, str(exc))
    rows = list(db.instances.find({"renter_email": email}).sort("_id", -1).limit(100))
    return [_instance_payload(r) for r in rows]


@app.get("/api/ledger")
def ledger(email: str, limit: int = 50):
    """Immutable audit trail of credits and charges for one account."""
    db = store.get_db()
    try:
        email = _clean_email(email)
    except ValueError as exc:
        raise HTTPException(422, str(exc))
    limit = max(1, min(int(limit), 200))
    rows = list(db.transactions.find({"email": email}).sort("created_at", -1).limit(limit))
    return [
        {
            "kind": r.get("kind"),
            "paise": int(r.get("paise") or 0),
            "instance_id": r.get("instance_id"),
            "host_id": r.get("host_id"),
            "note": r.get("note"),
            "created_at": store.as_utc(r.get("created_at")).isoformat() if r.get("created_at") else None,
        }
        for r in rows
    ]
