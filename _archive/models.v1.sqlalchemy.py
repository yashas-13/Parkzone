"""ParkZone DB models - works on SQLite (local dev) and PostgreSQL (VPS) via DATABASE_URL."""
from sqlalchemy import Column, DateTime, Float, Integer, String, func
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class Host(Base):
    __tablename__ = "hosts"
    id = Column(Integer, primary_key=True)
    host_id = Column(String, unique=True, index=True)
    gpu_model = Column(String, default="Unknown GPU")
    vram = Column(Integer, default=0)  # MB
    city = Column(String, default="Mumbai")
    price_per_hour = Column(Integer, default=21)   # host share, Rs
    display_price = Column(Integer, default=29)    # renter price, Rs/hr
    status = Column(String, default="online")
    last_heartbeat = Column(DateTime(timezone=True), server_default=func.now())
    owner_email = Column(String, default="")
    uptime_percent = Column(Float, default=100.0)


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String, default="")
    wallet_balance = Column(Integer, default=0)  # paise
    role = Column(String, default="renter")


class Instance(Base):
    __tablename__ = "instances"
    id = Column(Integer, primary_key=True)
    host_id = Column(String, index=True, default="")
    renter_email = Column(String, index=True, default="")
    ssh_port = Column(Integer, default=0)
    jupyter_port = Column(Integer, default=0)
    status = Column(String, default="running")
    start_time = Column(DateTime(timezone=True), server_default=func.now())
    docker_container_id = Column(String, default="")
    cost_per_minute = Column(Integer, default=0)  # paise
    docker_image = Column(String, default="pytorch/pytorch")
