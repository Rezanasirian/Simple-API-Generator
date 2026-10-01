import logging

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.deps import DB, AdminUser, CurrentUser
from app.engine import connectors
from app.engine.connectors import ConnectorError
from app.models import DataSource
from app.schemas import (
    ColumnInfo,
    ConnectionTestResult,
    DataSourceConfig,
    DataSourceIn,
    DataSourceOut,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/data-sources", tags=["data sources"])


def to_out(ds: DataSource) -> DataSourceOut:
    cfg = DataSourceConfig.model_validate(ds.config)
    has_password = bool(cfg.password)
    # Passwords are write-only.
    cfg.password = None
    return DataSourceOut(
        id=ds.id,
        name=ds.name,
        type=ds.type,
        config=cfg,
        has_password=has_password,
        api_count=len(ds.apis),
        created_at=ds.created_at,
        updated_at=ds.updated_at,
    )


def get_or_404(db, ds_id: int) -> DataSource:
    ds = db.get(DataSource, ds_id)
    if not ds:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Data source not found")
    return ds


def _check_name(db, name: str, exclude_id: int | None = None) -> None:
    existing = db.scalar(select(DataSource).where(DataSource.name == name))
    if existing and existing.id != exclude_id:
        raise HTTPException(status.HTTP_409_CONFLICT, "A data source with this name already exists")


def _run_test(ds_type, cfg: DataSourceConfig) -> ConnectionTestResult:
    try:
        connectors.test_connection(ds_type, cfg)
        return ConnectionTestResult(ok=True, message="Connection successful")
    except Exception as e:
        return ConnectionTestResult(ok=False, message=str(e))


@router.get("", response_model=list[DataSourceOut])
def list_data_sources(db: DB, _: CurrentUser):
    return [to_out(ds) for ds in db.scalars(select(DataSource).order_by(DataSource.name))]


@router.post("", response_model=DataSourceOut, status_code=201)
def create_data_source(body: DataSourceIn, db: DB, _: AdminUser):
    _check_name(db, body.name)
    ds = DataSource(name=body.name, type=body.type, config=body.config.model_dump())
    db.add(ds)
    db.commit()
    return to_out(ds)


@router.post("/test", response_model=ConnectionTestResult)
def test_unsaved(body: DataSourceIn, _: AdminUser, db: DB, existing_id: int | None = None):
    """Test settings before saving. With `existing_id`, a blank password reuses the stored one."""
    cfg = body.config
    if existing_id is not None and not cfg.password:
        stored = DataSourceConfig.model_validate(get_or_404(db, existing_id).config)
        cfg = cfg.model_copy(update={"password": stored.password})
    return _run_test(body.type, cfg)


@router.get("/{ds_id}", response_model=DataSourceOut)
def get_data_source(ds_id: int, db: DB, _: CurrentUser):
    return to_out(get_or_404(db, ds_id))


@router.put("/{ds_id}", response_model=DataSourceOut)
def update_data_source(ds_id: int, body: DataSourceIn, db: DB, _: AdminUser):
    ds = get_or_404(db, ds_id)
    _check_name(db, body.name, exclude_id=ds.id)
    if ds.apis and body.type != ds.type:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Cannot change the type of a data source that has APIs"
        )
    cfg = body.config.model_dump()
    if not cfg.get("password"):
        cfg["password"] = (ds.config or {}).get("password")
    ds.name, ds.type, ds.config = body.name, body.type, cfg
    db.commit()
    connectors.forget(ds.id)
    return to_out(ds)


@router.delete("/{ds_id}", status_code=204)
def delete_data_source(ds_id: int, db: DB, _: AdminUser):
    ds = get_or_404(db, ds_id)
    if ds.apis:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"{len(ds.apis)} API(s) use this data source; delete or move them first",
        )
    db.delete(ds)
    db.commit()
    connectors.forget(ds_id)


@router.post("/{ds_id}/test", response_model=ConnectionTestResult)
def test_saved(ds_id: int, db: DB, _: CurrentUser):
    ds = get_or_404(db, ds_id)
    return _run_test(ds.type, DataSourceConfig.model_validate(ds.config))


def _introspect(fn, *args):
    try:
        return fn(*args)
    except ConnectorError as e:
        logger.warning("Introspection failed: %s", e)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Data source error: {e}") from e


@router.get("/{ds_id}/databases", response_model=list[str])
def databases(ds_id: int, db: DB, _: CurrentUser):
    return _introspect(connectors.list_databases, get_or_404(db, ds_id))


@router.get("/{ds_id}/tables", response_model=list[str])
def tables(ds_id: int, db: DB, _: CurrentUser, database: str | None = None):
    return _introspect(connectors.list_tables, get_or_404(db, ds_id), database)


@router.get("/{ds_id}/columns", response_model=list[ColumnInfo])
def columns(ds_id: int, table: str, db: DB, _: CurrentUser, database: str | None = None):
    return _introspect(connectors.list_columns, get_or_404(db, ds_id), database, table)
