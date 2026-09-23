"""ParkZone data layer.

Production: MongoDB Atlas (MONGO_URI) with a bounded connection pool.
Local dev:  in-memory mongomock when MONGO_URI is unset.

Every helper here is the single source of truth for collection access so the
HTTP layer never touches pymongo internals directly.
"""
import logging
import os
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv

load_dotenv()

log = logging.getLogger("parkzone.db")

MONGO_URI = os.environ.get("MONGO_URI", "").strip()
DB_NAME = os.environ.get("MONGO_DB", "parkzone").strip() or "parkzone"
HOST_TTL_SECONDS = int(os.environ.get("PZ_HOST_TTL_SECONDS", "120"))

_client = None
_db = None


def _is_dev_fallback() -> bool:
    return not MONGO_URI


def get_db():
    """Return the Mongo database handle, connecting once on first use."""
    global _client, _db
    if _db is not None:
        return _db
    if MONGO_URI:
        from pymongo import MongoClient

        _client = MongoClient(
            MONGO_URI,
            serverSelectionTimeoutMS=8000,
            connectTimeoutMS=8000,
            socketTimeoutMS=20000,
            maxPoolSize=50,
            retryWrites=True,
            appname="parkzone-api",
        )
        _client.admin.command("ping")
        _db = _client[DB_NAME]
        log.info("connected to MongoDB db=%s", DB_NAME)
    else:
        try:
            import mongomock
        except ImportError as exc:  # pragma: no cover
            raise RuntimeError(
                "MONGO_URI is not set and mongomock is not installed. "
                "Set MONGO_URI in backend/.env (Atlas connection string) "
                "or run: pip install mongomock"
            ) from exc
        _client = mongomock.MongoClient()
        _db = _client[DB_NAME]
        log.warning("MONGO_URI unset - using in-memory mongomock (dev only)")
    _ensure_indexes(_db)
    return _db


def _ensure_indexes(db) -> None:
    """Idempotent index creation. Safe to run on every boot."""
    db.hosts.create_index("host_id", unique=True)
    db.hosts.create_index([("status", 1), ("last_heartbeat", -1)])
    db.users.create_index("email", unique=True)
    db.instances.create_index("renter_email")
    db.instances.create_index([("host_id", 1), ("status", 1)])
    db.instances.create_index("status")
    db.instances.create_index("idempotency_key", sparse=True)
    db.transactions.create_index([("email", 1), ("created_at", -1)])
    db.transactions.create_index("idempotency_key", unique=True, sparse=True)
    db.counters.create_index([("kind", 1)], unique=True)


def ping() -> None:
    """Cheap liveness probe used by /api/health."""
    get_db().command("ping")


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def as_utc(value):
    """Mongo returns naive datetimes; normalise everything to aware UTC."""
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def heartbeat_cutoff() -> datetime:
    return now_utc() - timedelta(seconds=HOST_TTL_SECONDS)


def next_sequence(kind: str, start: int = 1) -> int:
    """Atomically allocate the next integer for `kind`.

    Replaces the old in-process list counters, which reset to the base port on
    every restart and handed the same port to two different renters.
    """
    from pymongo import ReturnDocument

    db = get_db()
    doc = db.counters.find_one_and_update(
        {"kind": kind},
        {"$inc": {"value": 1}, "$setOnInsert": {"kind": kind, "start": start}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    if not doc or "value" not in doc:
        raise RuntimeError(f"counter {kind} allocation failed")
    # value starts at 1 on the very first allocation -> return `start`
    return start + int(doc["value"]) - 1


def sweep_stale_hosts() -> int:
    """Flip hosts whose last heartbeat expired to offline. Returns count."""
    db = get_db()
    res = db.hosts.update_many(
        {"status": "online", "last_heartbeat": {"$lt": heartbeat_cutoff()}},
        {"$set": {"status": "offline"}},
    )
    return int(res.modified_count or 0)


def record_txn(email: str, kind: str, paise: int, **extra) -> None:
    """Append an immutable ledger row. Negative paise = debit, positive = credit."""
    db = get_db()
    doc = {"email": email, "kind": kind, "paise": int(paise), "created_at": now_utc()}
    doc.update(extra)
    db.transactions.insert_one(doc)
