"""Test bootstrap: force the in-memory Mongo fallback before app import."""
import os
import sys

BACKEND = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend")
sys.path.insert(0, BACKEND)

# Must be set before `import main` / `import db` are evaluated.
os.environ["MONGO_URI"] = ""
os.environ["PZ_DEV_MODE"] = "true"
os.environ["PZ_ADMIN_TOKEN"] = "testtoken"
os.environ["PZ_HOST_TTL_SECONDS"] = "2"
os.environ["PZ_RATE_READ_PER_MIN"] = "100000"
os.environ["PZ_RATE_WRITE_PER_MIN"] = "100000"

import mongomock  # noqa: E402
import pytest  # noqa: E402

import db as store  # noqa: E402
import main as api  # noqa: E402


@pytest.fixture(autouse=True)
def fresh_db():
    """Every test starts from an empty database."""
    store._db = None
    store._client = None
    client = mongomock.MongoClient()
    store._db = client[store.DB_NAME]
    store._ensure_indexes(store._db)
    api._RATE_HITS.clear()  # throttling is per-process; do not leak between tests
    api._last_sweep[0] = 0.0
    yield store._db
    store._db = None
    store._client = None


@pytest.fixture
def client():
    from fastapi.testclient import TestClient

    with TestClient(api.app) as c:
        yield c


@pytest.fixture
def host_payload():
    return {
        "host_id": "PC_TEST1234",
        "gpu_model": "NVIDIA GeForce RTX 4090",
        "vram": 24564,
        "city": "Mumbai",
        "price_per_hour": 21,
        "owner_email": "host@parkzone.in",
    }
