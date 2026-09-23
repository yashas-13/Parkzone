"""ParkZone backend/agent.py - Windows Host Agent.
Collects GPU info, heartbeats to https://parkzone.in/api/heartbeat every 30s,
polls GET /api/jobs?host_id= and starts docker on rent jobs.

Run:  pip install gputil psutil requests docker
Build: pyinstaller --onefile --noconsole agent.py  -> copy dist/agent.exe to public/agent.exe
"""
import hashlib
import json
import os
import subprocess
import time
import uuid

import requests

SERVER = os.environ.get("PARKZONE_SERVER", "https://parkzone.in")
CONFIG_FILE = os.path.join(os.path.expanduser("~"), ".parkzone.json")


def get_mac() -> str:
    mac = uuid.getnode()
    return ":".join(f"{(mac >> i) & 0xFF:02x}" for i in range(40, -1, -8))


def load_or_setup_config() -> dict:
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE) as f:
            return json.load(f)
    print("=== ParkZone Host Setup ===")
    owner_email = input("Owner email: ").strip()
    city = input("City (e.g. Mumbai): ").strip() or "Mumbai"
    price = input("Price per hour in Rs (host share, e.g. 21): ").strip() or "21"
    host_id = "PC_" + hashlib.sha1(get_mac().encode()).hexdigest()[:8].upper()
    cfg = {"host_id": host_id, "owner_email": owner_email, "city": city,
           "price_per_hour": int(price)}
    with open(CONFIG_FILE, "w") as f:
        json.dump(cfg, f)
    print(f"Host ID: {host_id} - keep earning!")
    return cfg


def get_gpu_info():
    """Returns (gpu_model, vram_mb). Falls back gracefully when no GPU."""
    try:
        import GPUtil
        gpus = GPUtil.getGPUs()
        if gpus:
            g = gpus[0]
            return g.name, int(g.memoryTotal)
    except Exception:
        pass
    return "RTX 3060 (simulated)", 12288


def main():
    cfg = load_or_setup_config()
    print(f"ParkZone agent running as {cfg['host_id']} -> {SERVER}")
    while True:
        try:
            gpu_model, vram = get_gpu_info()
            hb = {"host_id": cfg["host_id"], "gpu_model": gpu_model, "vram": vram,
                  "city": cfg["city"], "price_per_hour": cfg["price_per_hour"],
                  "owner_email": cfg["owner_email"]}
            r = requests.post(f"{SERVER}/api/heartbeat", json=hb, timeout=15)
            print("heartbeat:", r.json() if r.ok else r.status_code)
            # Poll for rent jobs
            j = requests.get(f"{SERVER}/api/jobs", params={"host_id": cfg["host_id"]}, timeout=15)
            if j.ok:
                for job in j.json().get("jobs", []):
                    print("rent job:", job)
                    try:
                        subprocess.Popen([
                            "docker", "run", "--gpus", "all", "-d",
                            "-p", f"{job['ssh_port']}:22",
                            "-p", f"{job['jupyter_port']}:8888",
                            job.get("docker_image", "pytorch/pytorch"),
                        ])
                    except Exception as e:
                        print("docker start failed:", e)
        except Exception as e:
            print("agent error:", e)
        time.sleep(30)


if __name__ == "__main__":
    main()
