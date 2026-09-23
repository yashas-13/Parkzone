"""ParkZone MongoDB layer - MongoDB Atlas (primary) with mongomock/in-memory fallback for local dev."""
import os
from datetime import datetime, timezone

from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.environ.get("MONGO_URI", "")
DB_NAME = os.environ.get("MONGO_DB", "parkzone")

_client = None
_db = None


def get_db():
    global _client, _db
    if _db is not None:
        return _db
    if MONGO_URI:
        from pymongo import MongoClient
        _client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=8000)
        # fail fast with clear error if Atlas IP/Users not configured
        _client.admin.command("ping")
        _db = _client[DB_NAME]
    else:
        # local dev fallback - no Atlas needed
        try:
            import mongomock
            _client = mongomock.MongoClient()
            _db = _client[DB_NAME]
        except ImportError:
            raise RuntimeError(
                "MONGO_URI not set and mongomock not installed. "
                "Set MONGO_URI in backend/.env (MongoDB Atlas connection string) "
                "or pip install mongomock for local dev."
            )
    # indexes (idempotent)
    _db.hosts.create_index("host_id", unique=True)
    _db.users.create_index("email", unique=True)
    _db.instances.create_index("renter_email")
    _db.instances.create_index("host_id")
    return _db


def now_utc():
    return datetime.now(timezone.utc)
