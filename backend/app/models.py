from datetime import UTC, datetime
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


def utcnow() -> datetime:
    return datetime.now(UTC)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(150), unique=True)
    password_hash: Mapped[str] = mapped_column(String(200))
    role: Mapped[str] = mapped_column(String(20), default="user")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    api_keys: Mapped[list["ApiKey"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"


class ApiKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(100))
    key_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    # First characters of the key, shown in the UI so users can tell keys apart.
    prefix: Mapped[str] = mapped_column(String(16))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship(back_populates="api_keys")


class DataSource(Base):
    """A target database that generated APIs read from."""

    __tablename__ = "data_sources"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    type: Mapped[str] = mapped_column(String(20))
    # Connection settings; shape depends on `type` (see schemas.DataSourceConfig).
    config: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    apis: Mapped[list["ApiDefinition"]] = relationship(back_populates="data_source")


class ApiDefinition(Base):
    """A generated API: which table it reads, which filters it accepts and what it returns."""

    __tablename__ = "api_definitions"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Public identifier; the endpoint is served at /api/{slug}.
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    version: Mapped[str] = mapped_column(String(20), default="1.0.0")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    require_api_key: Mapped[bool] = mapped_column(Boolean, default=True)

    data_source_id: Mapped[int] = mapped_column(ForeignKey("data_sources.id"))
    # Database (MongoDB / MySQL) or schema (PostgreSQL / Trino) that holds the table.
    database: Mapped[str] = mapped_column(String(200), default="")
    table: Mapped[str] = mapped_column(String(200))

    default_limit: Mapped[int] = mapped_column(Integer, default=50)
    max_limit: Mapped[int] = mapped_column(Integer, default=1000)
    default_order_field: Mapped[str | None] = mapped_column(String(200))
    default_order_direction: Mapped[str] = mapped_column(String(4), default="ASC")
    cache_ttl: Mapped[int] = mapped_column(Integer, default=0)

    conditions: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    response_fields: Mapped[list[str]] = mapped_column(JSON, default=list)
    response_transforms: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    data_source: Mapped[DataSource] = relationship(back_populates="apis")


class ApiCall(Base):
    """One call to a generated API, used for the dashboard."""

    __tablename__ = "api_calls"

    id: Mapped[int] = mapped_column(primary_key=True)
    api_slug: Mapped[str] = mapped_column(String(100), index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    api_key_id: Mapped[int | None] = mapped_column(ForeignKey("api_keys.id", ondelete="SET NULL"))
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    status_code: Mapped[int] = mapped_column(Integer)
    response_time_ms: Mapped[float] = mapped_column()
    error_message: Mapped[str | None] = mapped_column(Text)
