"""ParkZone Host Agent - Windows.

What it does, in order:
  1. Reads (or interactively creates) ~/.parkzone.json with host id, city, price.
  2. Every 30s: POST /api/heartbeat so the GPU stays listed as online.
  3. Polls GET /api/jobs for rentals this host must provision.
  4. Starts a Docker container with hard resource limits, then reports the
     outcome to POST /api/job-status so the renter sees a real state.

Design notes that matter in production:
  * Renter workloads are NEVER run on the host OS - always in a container.
  * Containers are started with memory/CPU/PID limits, no new privileges and
    all Linux capabilities dropped, so a hostile job cannot wedge the machine.
  * Every network call retries with exponential backoff + jitter; the agent
    never dies because the API had a bad minute.
  * Secrets/config file is written with owner-only permissions.

Run:    python agent.py
Build:  pyinstaller --onefile --noconsole --name ParkZoneAgent agent.py
        (then publish dist/ParkZoneAgent.exe as public/agent.exe and post its SHA-256)
Deps:   pip install requests
        optional: gputil (real GPU detection), psutil (uptime logging)
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import random
import signal
import stat
import subprocess
import sys
import time
import uuid

import requests

AGENT_VERSION = "2.0.0"
SERVER = os.environ.get("PARKZONE_SERVER", "https://parkzone.in").rstrip("/")
HOST_TOKEN = os.environ.get("PARKZONE_HOST_TOKEN", "").strip()
CONFIG_FILE = os.path.join(os.path.expanduser("~"), ".parkzone.json")
LOG_FILE = os.path.join(os.path.expanduser("~"), ".parkzone-agent.log")
HEARTBEAT_SECONDS = int(os.environ.get("PARKZONE_HEARTBEAT", "30"))
MAX_LOG_BYTES = 512 * 1024

# Container limits applied to every renter job.
CONTAINER_MEMORY = os.environ.get("PARKZONE_JOB_MEMORY", "16g")
CONTAINER_CPUS = os.environ.get("PARKZONE_JOB_CPUS", "4")
CONTAINER_PIDS = os.environ.get("PARKZONE_JOB_PIDS", "2048")

log = logging.getLogger("parkzone-agent")
_running = True


# --------------------------------------------------------------------------- #
# logging                                                                     #
# --------------------------------------------------------------------------- #
def setup_logging() -> None:
    handlers = [logging.StreamHandler(sys.stdout)]
    try:
        handlers.append(_RotatingFileHandler(LOG_FILE, maxBytes=MAX_LOG_BYTES, backupCount=2))
    except Exception:
        pass
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)-7s %(message)s",
        datefmt="%H:%M:%S",
        handlers=handlers,
        force=True,
    )


class _RotatingFileHandler(logging.FileHandler):
    """Tiny size-rotating file handler so a long-running host cannot fill a disk."""

    def __init__(self, filename: str, maxBytes: int = MAX_LOG_BYTES, backupCount: int = 2):
        self.maxBytes = maxBytes
        self.backupCount = backupCount
        super().__init__(filename, encoding="utf-8")

    def emit(self, record: logging.LogRecord) -> None:  # pragma: no cover - host side
        super().emit(record)
        try:
            if self.stream and self.stream.tell() >= self.maxBytes:
                self.stream.close()
                for i in range(self.backupCount - 1, 0, -1):
                    src, dst = f"{self.baseFilename}.{i}", f"{self.baseFilename}.{i + 1}"
                    if os.path.exists(src):
                        os.replace(src, dst)
                os.replace(self.baseFilename, self.baseFilename + ".1")
                self.stream = self._open()
        except Exception:
            pass


# --------------------------------------------------------------------------- #
# config                                                                      #
# --------------------------------------------------------------------------- #
def device_id() -> str:
    mac = uuid.getnode()
    raw = ":".join(f"{(mac >> i) & 0xFF:02x}" for i in range(40, -1, -8))
    return "PC_" + hashlib.sha1(raw.encode()).hexdigest()[:8].upper()


def _valid_email(value: str) -> bool:
    value = (value or "").strip()
    return "@" in value and "." in value.split("@")[-1] and 5 <= len(value) <= 254


def load_or_setup_config() -> dict:
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, encoding="utf-8") as fh:
            cfg = json.load(fh)
        if cfg.get("host_id") and cfg.get("owner_email"):
            cfg["price_per_hour"] = int(cfg.get("price_per_hour", 21))
            return cfg
        log.warning("config file is incomplete - re-running setup")

    print("=== ParkZone Host Agent setup ===")
    while True:
        email = input("Owner email (for payouts): ").strip()
        if _valid_email(email):
            break
        print("  that does not look like an email address, try again")
    city = input("City (e.g. Mumbai): ").strip() or "Mumbai"
    while True:
        raw = input("Your price per hour in Rs (5-500, e.g. 21): ").strip() or "21"
        try:
            price = int(raw)
        except ValueError:
            print("  enter a whole number")
            continue
        if 5 <= price <= 500:
            break
        print("  keep it between 5 and 500")

    cfg = {
        "host_id": device_id(),
        "owner_email": email,
        "city": city[:48],
        "price_per_hour": price,
    }
    with open(CONFIG_FILE, "w", encoding="utf-8") as fh:
        json.dump(cfg, fh, indent=2)
    try:  # owner-only: the file carries the payout email
        os.chmod(CONFIG_FILE, stat.S_IRUSR | stat.S_IWUSR)
    except Exception:
        pass
    log.info("host id %s written to %s", cfg["host_id"], CONFIG_FILE)
    return cfg


# --------------------------------------------------------------------------- #
# hardware                                                                    #
# --------------------------------------------------------------------------- #
def get_gpu_info() -> tuple[str, int]:
    """Return (gpu_model, vram_mb). Tries nvidia-smi first: no extra dependency."""
    try:
        out = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader,nounits"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if out.returncode == 0 and out.stdout.strip():
            first = out.stdout.strip().splitlines()[0]
            name, _, mem = first.rpartition(",")
            return name.strip(), int(float(mem.strip()))
    except Exception:
        pass
    try:
        import GPUtil  # optional fallback

        gpus = GPUtil.getGPUs()
        if gpus:
            return gpus[0].name, int(gpus[0].memoryTotal)
    except Exception:
        pass
    return "Unknown NVIDIA GPU", 0


def docker_available() -> bool:
    try:
        return subprocess.run(["docker", "info"], capture_output=True, timeout=20).returncode == 0
    except Exception:
        return False


# --------------------------------------------------------------------------- #
# network                                                                     #
# --------------------------------------------------------------------------- #
def headers() -> dict:
    base = {"User-Agent": f"parkzone-agent/{AGENT_VERSION}", "Content-Type": "application/json"}
    if HOST_TOKEN:
        base["X-Host-Token"] = HOST_TOKEN
    return base


def call(method: str, path: str, payload: dict | None = None, attempts: int = 4):
    """Call the API with exponential backoff and jitter. Returns JSON or None."""
    url = f"{SERVER}{path}"
    for attempt in range(1, attempts + 1):
        try:
            if method == "GET":
                res = requests.get(url, headers=headers(), timeout=15)
            else:
                res = requests.post(url, headers=headers(), json=payload or {}, timeout=20)
            if res.status_code == 401:
                log.error("401 from %s - PARKZONE_HOST_TOKEN is wrong or missing", path)
                return None
            if res.status_code >= 500:
                raise requests.HTTPError(f"server {res.status_code}")
            res.raise_for_status()
            return res.json()
        except Exception as exc:
            wait = min(60, (2 ** attempt) + random.uniform(0, 1.5))
            log.warning("%s %s failed (%s) - retry in %.1fs", method, path, exc, wait)
            if attempt == attempts:
                return None
            time.sleep(wait)
    return None


# --------------------------------------------------------------------------- #
# jobs                                                                        #
# --------------------------------------------------------------------------- #
def start_container(job: dict) -> tuple[bool, str, str]:
    """Start the renter's container. Returns (ok, container_id, detail)."""
    image = job.get("docker_image") or "pytorch/pytorch"
    ssh_port = job.get("ssh_port")
    jup_port = job.get("jupyter_port")
    if not ssh_port or not jup_port:
        return False, "", "job is missing port assignments"
    cmd = [
        "docker", "run", "-d",
        "--name", f"parkzone-{job.get('instance_id', '')[:12]}",
        "--gpus", "all",
        "--memory", CONTAINER_MEMORY,
        "--cpus", CONTAINER_CPUS,
        "--pids-limit", CONTAINER_PIDS,
        "--cap-drop", "ALL",
        "--security-opt", "no-new-privileges",
        "--restart", "no",
        "-p", f"{ssh_port}:22",
        "-p", f"{jup_port}:8888",
        image,
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
    except subprocess.TimeoutExpired:
        return False, "", "docker run timed out after 600s"
    except Exception as exc:
        return False, "", f"docker could not be started: {exc}"
    if proc.returncode != 0:
        return False, "", (proc.stderr or "docker run failed").strip()[:300]
    return True, (proc.stdout or "").strip()[:64], "container started"


def handle_jobs(host_id: str) -> None:
    data = call("GET", f"/api/jobs?host_id={host_id}")
    if not data:
        return
    for job in data.get("jobs", []):
        instance_id = job.get("instance_id", "")
        log.info("rental received: %s -> image %s", instance_id, job.get("docker_image"))
        ok, container_id, detail = start_container(job)
        if ok:
            log.info("container %s up for %s", container_id[:12], instance_id)
        else:
            log.error("container failed for %s: %s", instance_id, detail)
        call(
            "POST",
            "/api/job-status",
            {
                "host_id": host_id,
                "instance_id": instance_id,
                "status": "running" if ok else "failed",
                "container_id": container_id or None,
                "detail": detail,
            },
        )


# --------------------------------------------------------------------------- #
# main loop                                                                   #
# --------------------------------------------------------------------------- #
def _stop(signum, frame):  # pragma: no cover - interactive host side
    global _running
    _running = False
    log.info("shutdown requested - finishing current cycle")


def main() -> int:
    setup_logging()
    signal.signal(signal.SIGINT, _stop)
    try:
        signal.signal(signal.SIGTERM, _stop)
    except Exception:
        pass

    cfg = load_or_setup_config()
    gpu_model, vram = get_gpu_info()
    if not docker_available():
        log.warning("Docker does not appear to be running - install Docker Desktop with WSL2 before hosting")
    log.info("ParkZone agent %s starting as %s", AGENT_VERSION, cfg["host_id"])
    log.info("GPU: %s (%s MB) - city %s - Rs %s/hr", gpu_model, vram, cfg["city"], cfg["price_per_hour"])
    log.info("server: %s%s", SERVER, " (token set)" if HOST_TOKEN else " (no host token - dev)")

    version = call("GET", "/api/version")
    if version and version.get("version") != AGENT_VERSION:
        log.warning("agent %s vs server %s - check for an updated build", AGENT_VERSION, version.get("version"))

    heartbeat: dict = {
        "host_id": cfg["host_id"],
        "owner_email": cfg["owner_email"],
        "city": cfg["city"],
        "price_per_hour": cfg["price_per_hour"],
        "gpu_model": gpu_model,
        "vram": vram,
    }
    failures = 0
    beats = 0
    while _running:
        res = call("POST", "/api/heartbeat", heartbeat)
        if res:
            if failures:
                log.info("heartbeat recovered after %s failed attempt(s)", failures)
            failures = 0
            beats += 1
            if beats % 10 == 1:  # one line every ~5 minutes instead of every 30s
                log.info("heartbeat ok - listed as online (%s beats sent)", beats - 1)
            handle_jobs(cfg["host_id"])
        else:
            failures += 1
            log.warning("heartbeat failed (%s in a row) - the GPU will drop off the marketplace", failures)
        for _ in range(HEARTBEAT_SECONDS):
            if not _running:
                break
            time.sleep(1)

    log.info("stopped - your listing leaves the marketplace within two minutes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
