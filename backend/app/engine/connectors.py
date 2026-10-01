"""Connections to the target databases, cached per data source."""

import threading
from datetime import datetime
from typing import Any

import sqlalchemy as sa
from pymongo import MongoClient

from app.schemas import SQL_TYPES, ColumnInfo, DataSourceConfig, DataSourceType

CONNECT_TIMEOUT_SECONDS = 5
MONGO_SAMPLE_SIZE = 100


class ConnectorError(RuntimeError):
    """The target database could not be reached or rejected the query."""


_lock = threading.Lock()
_cache: dict[int, tuple[datetime, Any]] = {}


# --- Building connections -----------------------------------------------------------------


def sql_url(ds_type: DataSourceType, cfg: DataSourceConfig) -> sa.URL | str:
    if cfg.uri:
        return cfg.uri
    if ds_type == DataSourceType.SQLITE:
        if not cfg.path:
            raise ConnectorError("SQLite data source needs a file path")
        return sa.URL.create("sqlite", database=cfg.path)
    drivers = {
        DataSourceType.MYSQL: ("mysql+pymysql", 3306),
        DataSourceType.POSTGRESQL: ("postgresql+psycopg", 5432),
        DataSourceType.TRINO: ("trino", 8080),
    }
    driver, default_port = drivers[ds_type]
    return sa.URL.create(
        driver,
        username=cfg.username or None,
        # Trino takes the password through connect_args instead.
        password=(cfg.password or None) if ds_type != DataSourceType.TRINO else None,
        host=cfg.host or "localhost",
        port=cfg.port or default_port,
        database=cfg.database or None,
    )


def create_sql_engine(ds_type: DataSourceType, cfg: DataSourceConfig) -> sa.Engine:
    connect_args: dict[str, Any] = {}
    if ds_type == DataSourceType.TRINO:
        from trino.auth import BasicAuthentication

        connect_args["http_scheme"] = cfg.http_scheme or ("https" if cfg.password else "http")
        connect_args["verify"] = cfg.verify_ssl
        if cfg.password:
            connect_args["auth"] = BasicAuthentication(cfg.username or "", cfg.password)
    elif ds_type == DataSourceType.MYSQL:
        connect_args["connect_timeout"] = CONNECT_TIMEOUT_SECONDS
    elif ds_type == DataSourceType.POSTGRESQL:
        connect_args["connect_timeout"] = CONNECT_TIMEOUT_SECONDS
    return sa.create_engine(sql_url(ds_type, cfg), connect_args=connect_args, pool_pre_ping=True)


def create_mongo_client(cfg: DataSourceConfig) -> MongoClient:
    timeout = CONNECT_TIMEOUT_SECONDS * 1000
    if cfg.uri:
        return MongoClient(cfg.uri, serverSelectionTimeoutMS=timeout)
    kwargs: dict[str, Any] = {
        "host": cfg.host or "localhost",
        "port": cfg.port or 27017,
        "serverSelectionTimeoutMS": timeout,
    }
    if cfg.username:
        kwargs["username"] = cfg.username
        kwargs["password"] = cfg.password or ""
        kwargs["authSource"] = cfg.auth_source or "admin"
        if cfg.auth_mechanism:
            kwargs["authMechanism"] = cfg.auth_mechanism
    return MongoClient(**kwargs)


def _create(ds_type: DataSourceType, cfg: DataSourceConfig) -> Any:
    if ds_type == DataSourceType.MONGODB:
        return create_mongo_client(cfg)
    return create_sql_engine(ds_type, cfg)


def _close(conn: Any) -> None:
    if isinstance(conn, sa.Engine):
        conn.dispose()
    else:
        conn.close()


def get_connection(ds) -> Any:
    """Return a cached SQLAlchemy engine or MongoClient for a DataSource row."""
    with _lock:
        cached = _cache.get(ds.id)
        if cached and cached[0] == ds.updated_at:
            return cached[1]
        if cached:
            _close(cached[1])
        conn = _create(DataSourceType(ds.type), DataSourceConfig.model_validate(ds.config))
        _cache[ds.id] = (ds.updated_at, conn)
        return conn


def forget(ds_id: int) -> None:
    with _lock:
        cached = _cache.pop(ds_id, None)
    if cached:
        _close(cached[1])


def close_all() -> None:
    with _lock:
        items = list(_cache.values())
        _cache.clear()
    for _, conn in items:
        _close(conn)


# --- Connection test and introspection ----------------------------------------------------


def test_connection(ds_type: DataSourceType, cfg: DataSourceConfig) -> None:
    conn = _create(ds_type, cfg)
    try:
        if ds_type == DataSourceType.MONGODB:
            conn.admin.command("ping")
        else:
            with conn.connect() as c:
                c.execute(sa.text("SELECT 1"))
    finally:
        _close(conn)


def _wrap(fn):
    def inner(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except ConnectorError:
            raise
        except Exception as e:
            raise ConnectorError(str(e)) from e

    return inner


@_wrap
def list_databases(ds) -> list[str]:
    """MongoDB databases, or schemas for SQL data sources."""
    conn = get_connection(ds)
    if ds.type == DataSourceType.MONGODB:
        return sorted(
            n for n in conn.list_database_names() if n not in {"admin", "local", "config"}
        )
    hidden = {"information_schema", "pg_catalog", "performance_schema", "mysql", "sys"}
    return sorted(s for s in sa.inspect(conn).get_schema_names() if s not in hidden)


@_wrap
def list_tables(ds, database: str | None) -> list[str]:
    conn = get_connection(ds)
    if ds.type == DataSourceType.MONGODB:
        if not database:
            raise ConnectorError("database is required for MongoDB")
        return sorted(conn[database].list_collection_names())
    inspector = sa.inspect(conn)
    schema = database or None
    return sorted(
        inspector.get_table_names(schema=schema) + inspector.get_view_names(schema=schema)
    )


@_wrap
def list_columns(ds, database: str | None, table: str) -> list[ColumnInfo]:
    conn = get_connection(ds)
    if ds.type == DataSourceType.MONGODB:
        if not database:
            raise ConnectorError("database is required for MongoDB")
        types: dict[str, str] = {}
        for doc in conn[database][table].find({}, limit=MONGO_SAMPLE_SIZE):
            for key, value in doc.items():
                if key != "_id":
                    types.setdefault(key, type(value).__name__)
        return [ColumnInfo(name=k, type=v) for k, v in types.items()]
    columns = sa.inspect(conn).get_columns(table, schema=database or None)
    return [ColumnInfo(name=c["name"], type=str(c["type"])) for c in columns]


def is_sql(ds_type: str) -> bool:
    return DataSourceType(ds_type) in SQL_TYPES
