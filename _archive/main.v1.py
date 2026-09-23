"""ParkZone FastAPI backend - MongoDB Atlas. Serves ONLY /api/* (parkzone.in)."""
import math
import os
from datetime import timedelta
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from db import get_db, now_utc
load_dotenv()
app = FastAPI(title="ParkZone API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
DOMAIN = os.environ.get("PARKZONE_DOMAIN", "parkzone.in")
_next_ssh = [22001]
_next_jup = [8901]
def display_price_for(h: int) -> int:
    return math.ceil(h * 1.38)
class Heartbeat(BaseModel):
    host_id: str
    gpu_model: str = "Unknown GPU"
    vram: int = 0
    city: str = "Mumbai"
    price_per_hour: int = 21
    owner_email: str = ""
class RentReq(BaseModel):
    host_id: str
    renter_email: str
    docker_image: str = "pytorch/pytorch"
class StopReq(BaseModel):
    instance_id: str
class WalletAdd(BaseModel):
    email: str
    amount: int
def ser_host(h):
    return {"gpu_model": h.get("gpu_model"), "vram": h.get("vram", 0), "city": h.get("city"), "display_price": h.get("display_price"), "uptime": h.get("uptime_percent", 100.0), "host_id": h.get("host_id")}
@app.get("/api/gpus")
def list_gpus():
    db = get_db()
    cutoff = now_utc() - timedelta(minutes=2)
    out = []
    for h in db.hosts.find({"status": "online"}):
        lb = h.get("last_heartbeat")
        if lb is None:
            continue
        if lb.tzinfo is None:
            from datetime import timezone
            lb = lb.replace(tzinfo=timezone.utc)
        if lb < cutoff:
            continue
        out.append(ser_host(h))
    return out
@app.post("/api/heartbeat")
def heartbeat(hb: Heartbeat):
    db = get_db()
    db.hosts.update_one({"host_id": hb.host_id}, {"$set": {"host_id": hb.host_id, "gpu_model": hb.gpu_model, "vram": hb.vram, "city": hb.city, "price_per_hour": hb.price_per_hour, "display_price": display_price_for(hb.price_per_hour), "owner_email": hb.owner_email, "status": "online", "last_heartbeat": now_utc()}, "$setOnInsert": {"uptime_percent": 100.0}}, upsert=True)
    return {"status": "ok", "jobs": []}
@app.get("/api/jobs")
def poll_jobs(host_id: str):
    return {"jobs": []}
@app.post("/api/rent")
def rent(req: RentReq):
    from bson import ObjectId
    db = get_db()
    h = db.hosts.find_one({"host_id": req.host_id})
    if not h:
        raise HTTPException(404, "host not found")
    u = db.users.find_one({"email": req.renter_email})
    if not u:
        db.users.insert_one({"email": req.renter_email, "password_hash": "", "wallet_balance": 0, "role": "renter"})
        u = {"wallet_balance": 0}
    cpm = math.ceil(h.get("display_price", 29) * 100 / 60)
    if u.get("wallet_balance", 0) < cpm * 10:
        raise HTTPException(402, "insufficient wallet balance, please add money")
    ssh_port = _next_ssh[0]
    jup = _next_jup[0]
    _next_ssh[0] += 1
    _next_jup[0] += 1
    r = db.instances.insert_one({"host_id": h["host_id"], "renter_email": req.renter_email, "ssh_port": ssh_port, "jupyter_port": jup, "status": "running", "start_time": now_utc(), "docker_container_id": f"mock-{ssh_port}", "cost_per_minute": cpm, "docker_image": req.docker_image})
    return {"instance_id": str(r.inserted_id), "ssh": f"ssh root@{DOMAIN} -p {ssh_port}", "jupyter": f"https://{DOMAIN}:{jup}"}
@app.post("/api/stop")
def stop(req: StopReq):
    from bson import ObjectId
    db = get_db()
    try:
        oid = ObjectId(req.instance_id)
    except Exception:
        raise HTTPException(404, "instance not found")
    inst = db.instances.find_one({"_id": oid})
    if not inst or inst.get("status") != "running":
        raise HTTPException(404, "instance not found or already stopped")
    start = inst.get("start_time")
    if start is not None and start.tzinfo is None:
        from datetime import timezone
        start = start.replace(tzinfo=timezone.utc)
    mins = max(1, math.ceil(((now_utc() - start).total_seconds()) / 60))
    cost = mins * inst.get("cost_per_minute", 0)
    db.users.update_one({"email": inst["renter_email"]}, [{"$set": {"wallet_balance": {"$max": [0, {"$subtract": ["$wallet_balance", cost]}]}}}])
    db.instances.update_one({"_id": oid}, {"$set": {"status": "stopped"}})
    return {"status": "stopped", "minutes": mins, "charged_paise": cost}
@app.get("/api/wallet")
def wallet(email: str):
    db = get_db()
    u = db.users.find_one({"email": email})
    return {"email": email, "balance": u["wallet_balance"] if u else 0}
@app.post("/api/wallet/add")
def wallet_add(w: WalletAdd):
    db = get_db()
    db.users.update_one({"email": w.email}, {"$setOnInsert": {"password_hash": "", "role": "renter"}, "$inc": {"wallet_balance": w.amount}}, upsert=True)
    u = db.users.find_one({"email": w.email})
    return {"email": w.email, "balance": u["wallet_balance"]}
@app.get("/api/instances")
def my_instances(email: str):
    db = get_db()
    rows = list(db.instances.find({"renter_email": email}).sort("_id", -1))
    return [{"instance_id": str(r["_id"]), "host_id": r.get("host_id"), "ssh_port": r.get("ssh_port"), "jupyter_port": r.get("jupyter_port"), "status": r.get("status"), "ssh": f"ssh root@{DOMAIN} -p {r.get('ssh_port')}", "jupyter": f"https://{DOMAIN}:{r.get('jupyter_port')}"} for r in rows]
@app.get("/api/health")
def health():
    get_db()
    return {"ok": True}
