import logging
import time

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, ValidationError
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.deps import DB, CurrentUser
from app.engine.executor import ApiRequest, ConnectorError, ParamError, run_api
from app.models import ApiDefinition, DataSource
from app.schemas import (
    ApiDefinitionBase,
    ApiDefinitionIn,
    ApiDefinitionOut,
    ApiExport,
    ApiSummary,
    ApiTestRequest,
    DataSourceType,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/apis", tags=["apis"])

EDITABLE_FIELDS = set(ApiDefinitionIn.model_fields)


def definition_of(row: ApiDefinition) -> ApiDefinitionIn:
    return ApiDefinitionIn.model_validate({f: getattr(row, f) for f in EDITABLE_FIELDS})


def to_out(row: ApiDefinition) -> ApiDefinitionOut:
    return ApiDefinitionOut(
        **definition_of(row).model_dump(),
        id=row.id,
        data_source_name=row.data_source.name,
        data_source_type=row.data_source.type,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def to_summary(row: ApiDefinition) -> ApiSummary:
    return ApiSummary(
        id=row.id,
        slug=row.slug,
        name=row.name,
        description=row.description,
        version=row.version,
        is_active=row.is_active,
        require_api_key=row.require_api_key,
        data_source_id=row.data_source_id,
        data_source_name=row.data_source.name,
        data_source_type=row.data_source.type,
        table=row.table,
        condition_count=len(row.conditions or []),
        updated_at=row.updated_at,
    )


def _get(db, api_id: int) -> ApiDefinition:
    row = db.get(ApiDefinition, api_id)
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "API not found")
    return row


def _validate_against_source(db, body: ApiDefinitionBase) -> DataSource:
    ds = db.get(DataSource, body.data_source_id)
    if not ds:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Data source not found")
    if ds.type == DataSourceType.MONGODB:
        if not body.database:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "MongoDB APIs need a database name")
        bad = [c.parameter for c in body.conditions if not c.column_transform.is_empty()]
        if bad:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"Column transforms are only supported for SQL data sources: {', '.join(bad)}",
            )
    return ds


def _check_slug(db, slug: str, exclude_id: int | None = None) -> None:
    existing = db.scalar(select(ApiDefinition).where(ApiDefinition.slug == slug))
    if existing and existing.id != exclude_id:
        raise HTTPException(status.HTTP_409_CONFLICT, f"An API with id '{slug}' already exists")


@router.get("", response_model=list[ApiSummary])
def list_apis(db: DB, _: CurrentUser):
    rows = db.scalars(
        select(ApiDefinition)
        .options(selectinload(ApiDefinition.data_source))
        .order_by(ApiDefinition.slug)
    )
    return [to_summary(r) for r in rows]


@router.post("", response_model=ApiDefinitionOut, status_code=201)
def create_api(body: ApiDefinitionIn, db: DB, _: CurrentUser):
    _validate_against_source(db, body)
    _check_slug(db, body.slug)
    row = ApiDefinition(**body.model_dump(mode="json"))
    db.add(row)
    db.commit()
    return to_out(row)


@router.get("/export", response_model=list[ApiExport])
def export_apis(db: DB, _: CurrentUser):
    rows = db.scalars(select(ApiDefinition).order_by(ApiDefinition.slug))
    exported = []
    for row in rows:
        api = definition_of(row).model_dump(mode="json")
        api.pop("data_source_id")
        exported.append(ApiExport(data_source=row.data_source.name, api=api))
    return exported


class ImportResult(BaseModel):
    created: list[str]
    updated: list[str]
    skipped: list[str]


@router.post("/import", response_model=ImportResult)
def import_apis(body: list[ApiExport], db: DB, _: CurrentUser, overwrite: bool = False):
    sources = {ds.name: ds for ds in db.scalars(select(DataSource))}
    result = ImportResult(created=[], updated=[], skipped=[])
    parsed: list[ApiDefinitionIn] = []
    for i, item in enumerate(body):
        ds = sources.get(item.data_source)
        if not ds:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, f"Item {i}: data source '{item.data_source}' not found"
            )
        try:
            definition = ApiDefinitionIn.model_validate({**item.api, "data_source_id": ds.id})
        except ValidationError as e:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, f"Item {i}: {e}") from e
        _validate_against_source(db, definition)
        parsed.append(definition)

    for definition in parsed:
        existing = db.scalar(select(ApiDefinition).where(ApiDefinition.slug == definition.slug))
        if existing and not overwrite:
            result.skipped.append(definition.slug)
            continue
        if existing:
            for key, value in definition.model_dump(mode="json").items():
                setattr(existing, key, value)
            result.updated.append(definition.slug)
        else:
            db.add(ApiDefinition(**definition.model_dump(mode="json")))
            result.created.append(definition.slug)
    db.commit()
    return result


class PreviewRequest(BaseModel):
    definition: ApiDefinitionIn
    request: ApiTestRequest = ApiTestRequest()


@router.post("/preview")
def preview_api(body: PreviewRequest, db: DB, _: CurrentUser):
    """Run a (possibly unsaved) definition and return the result together with the query."""
    ds = _validate_against_source(db, body.definition)
    req = body.request
    started = time.perf_counter()
    try:
        result = run_api(
            body.definition,
            ds,
            ApiRequest(
                params=req.params,
                limit=req.limit,
                offset=req.offset,
                order_by=req.order_by,
                order_direction=req.order_direction,
                include_query=True,
            ),
        )
    except ParamError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, {"errors": e.errors}) from e
    except ConnectorError as e:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Data source error: {e}") from e
    return {"time_ms": round((time.perf_counter() - started) * 1000, 1), "result": result}


@router.get("/{api_id}", response_model=ApiDefinitionOut)
def get_api(api_id: int, db: DB, _: CurrentUser):
    return to_out(_get(db, api_id))


@router.put("/{api_id}", response_model=ApiDefinitionOut)
def update_api(api_id: int, body: ApiDefinitionIn, db: DB, _: CurrentUser):
    row = _get(db, api_id)
    _validate_against_source(db, body)
    _check_slug(db, body.slug, exclude_id=row.id)
    for key, value in body.model_dump(mode="json").items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return to_out(row)


@router.delete("/{api_id}", status_code=204)
def delete_api(api_id: int, db: DB, _: CurrentUser):
    db.delete(_get(db, api_id))
    db.commit()
