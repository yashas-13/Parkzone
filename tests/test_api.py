"""ParkZone API contract tests - every route plus every error path."""
import pytest

import db as store
import main as api


# --------------------------------------------------------------------------- #
# Health, version, docs                                                       #
# --------------------------------------------------------------------------- #
def test_health_ok(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True and body["db"] == "up"
    assert r.headers["X-API-Version"] == api.API_VERSION
    assert "X-Request-ID" in r.headers


def test_version_and_root(client):
    assert client.get("/api/version").json()["domain"] == api.DOMAIN
    assert client.get("/api").json()["service"] == "parkzone-api"
    assert client.get("/").status_code == 200
    assert client.get("/api/docs").status_code == 200
    assert client.get("/api/openapi.json").status_code == 200


def test_unknown_route_is_404(client):
    assert client.get("/api/nope").status_code == 404


# --------------------------------------------------------------------------- #
# Heartbeat + validation                                                      #
# --------------------------------------------------------------------------- #
def test_heartbeat_upserts_and_prices(client, host_payload):
    r = client.post("/api/heartbeat", json=host_payload)
    assert r.status_code == 200 and r.json()["status"] == "ok"
    hosts = client.get("/api/gpus").json()
    assert len(hosts) == 1
    assert hosts[0]["display_price"] == 29  # ceil(21 * 1.38)
    assert hosts[0]["uptime"] == 100.0


def test_heartbeat_is_idempotent_per_host(client, host_payload):
    client.post("/api/heartbeat", json=host_payload)
    client.post("/api/heartbeat", json=host_payload)
    assert len(client.get("/api/gpus").json()) == 1


@pytest.mark.parametrize(
    "mutate",
    [
        {"host_id": "ab"},                       # too short / invalid pattern
        {"host_id": "bad host id!"},              # illegal characters
        {"price_per_hour": 0},                    # below floor
        {"price_per_hour": 501},                  # above ceiling
        {"vram": -1},                             # negative VRAM
        {"vram": 999999},                         # absurd VRAM
        {"gpu_model": "x" * 200},                 # over max_length
        {"owner_email": "not-an-email"},          # invalid email
    ],
)
def test_heartbeat_rejects_bad_input(client, host_payload, mutate):
    r = client.post("/api/heartbeat", json={**host_payload, **mutate})
    assert r.status_code == 422


def test_gpu_filters(client, host_payload):
    client.post("/api/heartbeat", json=host_payload)
    client.post("/api/heartbeat", json={**host_payload, "host_id": "PC_TINY1", "vram": 4096, "city": "Pune"})
    assert len(client.get("/api/gpus").json()) == 2
    assert len(client.get("/api/gpus", params={"city": "Pune"}).json()) == 1
    assert len(client.get("/api/gpus", params={"min_vram": 16000}).json()) == 1
    assert len(client.get("/api/gpus", params={"max_price": 10}).json()) == 0
    assert client.get("/api/gpus", params={"min_vram": 999999}).status_code == 422
    assert client.get("/api/gpus", params={"max_price": 0}).status_code == 422


# --------------------------------------------------------------------------- #
# Wallet                                                                      #
# --------------------------------------------------------------------------- #
RENTER = "renter@parkzone.in"


def fund(client, email=RENTER, amount=50000):
    r = client.post("/api/wallet/add", json={"email": email, "amount": amount})
    assert r.status_code == 200, r.text
    return r.json()["balance"]


def online_host(client, host_payload, **overrides):
    client.post("/api/heartbeat", json={**host_payload, **overrides})


def test_wallet_add_and_read(client):
    assert fund(client) == 50000
    body = client.get("/api/wallet", params={"email": RENTER}).json()
    assert body["balance"] == 50000 and body["currency"] == "INR"


def test_wallet_add_enforces_amount_bounds(client):
    assert client.post("/api/wallet/add", json={"email": RENTER, "amount": 100}).status_code == 422
    assert client.post("/api/wallet/add", json={"email": RENTER, "amount": 99_999_999}).status_code == 422
    assert client.post("/api/wallet/add", json={"email": "nope", "amount": 5000}).status_code == 422


def test_wallet_add_is_idempotent(client):
    key = "topup-abc12345"
    first = client.post("/api/wallet/add", json={"email": RENTER, "amount": 5000, "idempotency_key": key}).json()
    replay = client.post("/api/wallet/add", json={"email": RENTER, "amount": 5000, "idempotency_key": key}).json()
    assert first["balance"] == 5000
    assert replay["balance"] == 5000 and replay["replayed"] is True


def test_wallet_and_instances_reject_bad_email(client):
    assert client.get("/api/wallet", params={"email": "bad"}).status_code == 422
    assert client.get("/api/instances", params={"email": "bad"}).status_code == 422
    assert client.get("/api/ledger", params={"email": "bad"}).status_code == 422


# --------------------------------------------------------------------------- #
# Rent                                                                        #
# --------------------------------------------------------------------------- #
def test_rent_without_host_is_404(client):
    fund(client)
    r = client.post("/api/rent", json={"host_id": "PC_MISSING", "renter_email": RENTER})
    assert r.status_code == 404


def test_rent_requires_minimum_credit(client, host_payload):
    online_host(client, host_payload)
    r = client.post("/api/rent", json={"host_id": host_payload["host_id"], "renter_email": RENTER})
    assert r.status_code == 402 and "insufficient" in r.json()["detail"]


def test_rent_rejects_offline_host(client, host_payload):
    fund(client)
    online_host(client, host_payload)
    store.get_db().hosts.update_one({"host_id": host_payload["host_id"]}, {"$set": {"status": "offline"}})
    r = client.post("/api/rent", json={"host_id": host_payload["host_id"], "renter_email": RENTER})
    assert r.status_code == 409


def test_rent_allowlists_docker_images(client, host_payload):
    fund(client)
    online_host(client, host_payload)
    r = client.post(
        "/api/rent",
        json={"host_id": host_payload["host_id"], "renter_email": RENTER, "docker_image": "evil/miner:latest"},
    )
    assert r.status_code == 422


def test_rent_issues_ssh_and_jupyter_and_allocates_unique_ports(client, host_payload):
    fund(client)
    online_host(client, host_payload)
    first = client.post("/api/rent", json={"host_id": host_payload["host_id"], "renter_email": RENTER}).json()
    second = client.post("/api/rent", json={"host_id": host_payload["host_id"], "renter_email": RENTER}).json()
    assert first["ssh"] == f"ssh root@{api.DOMAIN} -p 22001"
    assert first["jupyter"] == f"https://{api.DOMAIN}:8901"
    assert second["ssh_port"] == 22002 and second["jupyter_port"] == 8902
    assert first["cost_per_minute"] == 49  # ceil(29.00 * 100 / 60)
    assert first["status"] == "provisioning"


def test_rent_is_idempotent(client, host_payload):
    fund(client)
    online_host(client, host_payload)
    body = {"host_id": host_payload["host_id"], "renter_email": RENTER, "idempotency_key": "rent-abcdef12"}
    a = client.post("/api/rent", json=body).json()
    b = client.post("/api/rent", json=body).json()
    assert a["instance_id"] == b["instance_id"]
    assert len(client.get("/api/instances", params={"email": RENTER}).json()) == 1


def test_jobs_dispatch_is_one_shot(client, host_payload):
    fund(client)
    online_host(client, host_payload)
    client.post("/api/rent", json={"host_id": host_payload["host_id"], "renter_email": RENTER})
    first = client.get("/api/jobs", params={"host_id": host_payload["host_id"]}).json()["jobs"]
    second = client.get("/api/jobs", params={"host_id": host_payload["host_id"]}).json()["jobs"]
    assert len(first) == 1 and first[0]["ssh_port"] == 22001
    assert second == []
    assert client.get("/api/jobs", params={"host_id": "bad id!"}).status_code == 422


# --------------------------------------------------------------------------- #
# Stop + billing + ledger                                                     #
# --------------------------------------------------------------------------- #
def _rent_and_dispatch(client, host_payload):
    online_host(client, host_payload)
    instance = client.post("/api/rent", json={"host_id": host_payload["host_id"], "renter_email": RENTER}).json()
    client.get("/api/jobs", params={"host_id": host_payload["host_id"]})
    return instance


def test_stop_bills_per_started_minute_and_writes_ledger(client, host_payload):
    fund(client)
    instance = _rent_and_dispatch(client, host_payload)
    r = client.post("/api/stop", json={"instance_id": instance["instance_id"], "renter_email": RENTER})
    assert r.status_code == 200
    body = r.json()
    assert body["minutes"] == 1
    assert body["charged_paise"] == 49
    assert body["balance"] == 50000 - 49
    statuses = [row["status"] for row in client.get("/api/instances", params={"email": RENTER}).json()]
    assert statuses == ["stopped"]
    kinds = [t["kind"] for t in client.get("/api/ledger", params={"email": RENTER}).json()]
    assert kinds == ["instance_stopped", "instance_created", "topup"]


def test_stop_never_drives_balance_negative(client, host_payload):
    fund(client, amount=500)
    instance = _rent_and_dispatch(client, host_payload)
    store.get_db().users.update_one({"email": RENTER}, {"$set": {"wallet_balance": 0}})
    body = client.post("/api/stop", json={"instance_id": instance["instance_id"]}).json()
    assert body["charged_paise"] == 0 and body["balance"] == 0


def test_stop_twice_is_conflict(client, host_payload):
    fund(client)
    instance = _rent_and_dispatch(client, host_payload)
    client.post("/api/stop", json={"instance_id": instance["instance_id"]})
    assert client.post("/api/stop", json={"instance_id": instance["instance_id"]}).status_code == 409


def test_stop_rejects_other_owners_and_bad_ids(client, host_payload):
    fund(client)
    instance = _rent_and_dispatch(client, host_payload)
    assert client.post("/api/stop", json={"instance_id": instance["instance_id"], "renter_email": "someone@else.in"}).status_code == 403
    assert client.post("/api/stop", json={"instance_id": "not-an-objectid"}).status_code == 404
    assert client.post("/api/stop", json={"instance_id": "bbbbbbbbbbbbbbbbbbbbbbbb"}).status_code == 404


# --------------------------------------------------------------------------- #
# Liveness TTL, auth guard, CORS                                              #
# --------------------------------------------------------------------------- #
def test_stale_hosts_drop_out_of_the_marketplace(client, host_payload):
    from datetime import timedelta

    online_host(client, host_payload)
    assert len(client.get("/api/gpus").json()) == 1
    db = store.get_db()
    db.hosts.update_one(
        {"host_id": host_payload["host_id"]},
        {"$set": {"last_heartbeat": store.now_utc() - timedelta(minutes=10)}},
    )
    api._last_sweep[0] = 0.0  # bypass the 10s sweep throttle
    assert client.get("/api/gpus").json() == []
    assert db.hosts.find_one({"host_id": host_payload["host_id"]})["status"] == "offline"
    assert client.get("/api/stats").json()["gpus_online"] == 0


def test_stats_reports_marketplace_telemetry(client, host_payload):
    online_host(client, host_payload)
    body = client.get("/api/stats").json()
    assert body["gpus_online"] == 1
    assert body["min_price"] == 29 and body["avg_price"] == 29.0
    assert body["cities"] == ["Mumbai"]
    assert body["aws_4090_price"] == 98


def test_wallet_add_requires_admin_token_in_production(client, monkeypatch):
    monkeypatch.setattr(api, "DEV_MODE", False)
    monkeypatch.setattr(api, "ADMIN_TOKEN", "secret-token")
    body = {"email": RENTER, "amount": 5000}
    assert client.post("/api/wallet/add", json=body).status_code == 401
    assert client.post("/api/wallet/add", json=body, headers={"X-Admin-Token": "wrong"}).status_code == 401
    ok = client.post("/api/wallet/add", json=body, headers={"X-Admin-Token": "secret-token"})
    assert ok.status_code == 200 and ok.json()["balance"] == 5000


def test_cors_allows_only_the_apex_domain(client):
    ok = client.options(
        "/api/gpus",
        headers={"Origin": "https://parkzone.in", "Access-Control-Request-Method": "GET"},
    )
    assert ok.headers.get("access-control-allow-origin") == "https://parkzone.in"
    blocked = client.options(
        "/api/gpus",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "GET"},
    )
    assert blocked.headers.get("access-control-allow-origin") is None


# --------------------------------------------------------------------------- #
# Host-facing security + provisioning lifecycle                                #
# --------------------------------------------------------------------------- #
def test_host_routes_require_token_when_configured(client, host_payload, monkeypatch):
    monkeypatch.setattr(api, "HOST_TOKEN", "host-secret")
    assert client.post("/api/heartbeat", json=host_payload).status_code == 401
    assert client.get("/api/jobs", params={"host_id": host_payload["host_id"]}).status_code == 401
    ok = client.post("/api/heartbeat", json=host_payload, headers={"X-Host-Token": "host-secret"})
    assert ok.status_code == 200
    assert len(client.get("/api/gpus").json()) == 1


def test_host_routes_stay_open_without_a_configured_token(client, host_payload):
    assert api.HOST_TOKEN == ""
    assert client.post("/api/heartbeat", json=host_payload).status_code == 200


def test_job_status_closes_the_provisioning_loop(client, host_payload):
    fund(client)
    online_host(client, host_payload)
    instance = client.post("/api/rent", json={"host_id": host_payload["host_id"], "renter_email": RENTER}).json()
    body = {
        "host_id": host_payload["host_id"],
        "instance_id": instance["instance_id"],
        "status": "running",
        "container_id": "abc123def456",
    }
    r = client.post("/api/job-status", json=body)
    assert r.status_code == 200 and r.json()["instance_status"] == "running"
    row = client.get("/api/instances", params={"email": RENTER}).json()[0]
    assert row["status"] == "running"
    # a late duplicate report is ignored, not an error
    assert client.post("/api/job-status", json=body).json()["status"] == "ignored"


def test_job_status_reports_failure_and_rejects_other_hosts(client, host_payload):
    fund(client)
    online_host(client, host_payload, host_id=host_payload["host_id"])
    instance = client.post("/api/rent", json={"host_id": host_payload["host_id"], "renter_email": RENTER}).json()
    wrong = {"host_id": "PC_SOMEONEELSE", "instance_id": instance["instance_id"], "status": "failed"}
    assert client.post("/api/job-status", json=wrong).status_code == 403
    fail = {"host_id": host_payload["host_id"], "instance_id": instance["instance_id"], "status": "failed", "detail": "docker: no CUDA device"}
    assert client.post("/api/job-status", json=fail).json()["instance_status"] == "failed"
    assert client.post("/api/job-status", json={"host_id": host_payload["host_id"], "instance_id": "not-an-id", "status": "failed"}).status_code == 404
    assert client.post("/api/job-status", json={"host_id": host_payload["host_id"], "instance_id": instance["instance_id"], "status": "weird"}).status_code == 422


def test_a_failed_instance_is_never_billed(client, host_payload):
    fund(client, amount=50000)
    online_host(client, host_payload)
    instance = client.post("/api/rent", json={"host_id": host_payload["host_id"], "renter_email": RENTER}).json()
    client.post("/api/job-status", json={"host_id": host_payload["host_id"], "instance_id": instance["instance_id"], "status": "failed"})
    # the instance is already closed, so stop is a conflict rather than a charge
    assert client.post("/api/stop", json={"instance_id": instance["instance_id"]}).status_code == 409
    assert client.get("/api/wallet", params={"email": RENTER}).json()["balance"] == 50000
    statuses = [row["status"] for row in client.get("/api/instances", params={"email": RENTER}).json()]
    assert statuses == ["failed"]


def test_repeat_running_reports_do_not_reset_the_billing_clock(client, host_payload):
    """A late duplicate report must not restart billing from now()."""
    import time as _time

    fund(client)
    online_host(client, host_payload)
    instance = client.post("/api/rent", json={"host_id": host_payload["host_id"], "renter_email": RENTER}).json()
    body = {"host_id": host_payload["host_id"], "instance_id": instance["instance_id"], "status": "running"}
    first = client.post("/api/job-status", json=body).json()
    started = client.get("/api/instances", params={"email": RENTER}).json()[0]["started_at"]
    _time.sleep(0.05)
    assert client.post("/api/job-status", json=body).json()["status"] == "ignored"
    assert client.get("/api/instances", params={"email": RENTER}).json()[0]["started_at"] == started
    assert first["instance_status"] == "running"
