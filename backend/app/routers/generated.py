"""The public endpoints of generated APIs: /api/{slug}."""

import logging
import time
from typing import Any

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool
from starlette.datastructures import Headers

from app.core.db import SessionLocal
from app.core.security import hash_api_key
from app.deps import user_from_token
from app.engine.executor import ApiRequest, ConnectorError, ParamError, run_api
from app.models import ApiCall, ApiDefinition, ApiKey, utcnow
from app.routers.apis import definition_of

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["generated apis"])

PAGING_KEYS = ("limit", "offset", "order_by", "order_direction")


def _authenticate(headers: Headers, db: Session) -> tuple[int | None, int | None]:
    """Return (user_id, api_key_id) from an X-API-Key header or a panel bearer token."""
    key = headers.get("x-api-key")
    if key:
        row = db.scalar(select(ApiKey).where(ApiKey.key_hash == hash_api_key(key)))
        if row and row.is_active and row.user.is_active:
            row.last_used_at = utcnow()
            db.commit()
            return row.user_id, row.id
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid API key")
    auth = headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        user = user_from_token(db, auth[7:])
        if user:
            return user.id, None
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    return None, None


def _int(value: Any, name: str) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        raise ParamError({name: "must be an integer"}) from None


def _log_call(slug: str, user_id, key_id, status_code: int, started: float, error: str | None):
    db = SessionLocal()
    try:
        db.add(
            ApiCall(
                api_slug=slug,
                user_id=user_id,
                api_key_id=key_id,
                status_code=status_code,
                response_time_ms=round((time.perf_counter() - started) * 1000, 2),
                error_message=error[:500] if error else None,
            )
        )
        db.commit()
    except Exception:
        logger.exception("Could not record API call")
    finally:
        db.close()


async def _read_params(request: Request) -> dict[str, Any]:
    params: dict[str, Any] = {}
    for key in request.query_params:
        values = request.query_params.getlist(key)
        params[key] = values if len(values) > 1 else values[0]
    if request.method == "POST":
        raw = await request.body()
        if raw:
            try:
                body = await request.json()
            except ValueError:
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST, "Body must be valid JSON"
                ) from None
            if not isinstance(body, dict):
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "Body must be a JSON object")
            # Query string values win over body values.
            params = {**body, **params}
    return params


@router.api_route("/{slug}", methods=["GET", "POST"], include_in_schema=False)
async def call_api(slug: str, request: Request):
    try:
        params = await _read_params(request)
    except HTTPException as e:
        return JSONResponse({"detail": e.detail}, status_code=e.status_code)
    # Database work is blocking, so run it off the event loop.
    return await run_in_threadpool(_handle, slug, request.headers, params)


def _handle(slug: str, headers: Headers, params: dict[str, Any]) -> JSONResponse:
    db = SessionLocal()
    try:
        row = db.scalar(select(ApiDefinition).where(ApiDefinition.slug == slug))
        if not row or not row.is_active:
            return JSONResponse({"detail": f"API '{slug}' not found"}, status_code=404)
        return _execute(db, row, headers, params)
    finally:
        db.close()


def _execute(db: Session, row: ApiDefinition, headers: Headers, params: dict[str, Any]):
    started = time.perf_counter()
    user_id = key_id = None
    status_code, error = 500, None
    try:
        user_id, key_id = _authenticate(headers, db)
        if row.require_api_key and user_id is None:
            raise HTTPException(
                status.HTTP_401_UNAUTHORIZED, "This API requires an X-API-Key header"
            )

        paging = {k: params.pop(k, None) for k in PAGING_KEYS}
        # The generated query is only shown to panel users, never to API key callers.
        debug = str(params.pop("debug", "")).lower() in ("1", "true")
        include_query = debug and user_id is not None and key_id is None

        result = run_api(
            definition_of(row),
            row.data_source,
            ApiRequest(
                params=params,
                limit=_int(paging["limit"], "limit"),
                offset=_int(paging["offset"], "offset") or 0,
                order_by=paging["order_by"],
                order_direction=paging["order_direction"],
                include_query=include_query,
            ),
        )
        status_code = 200
        response = JSONResponse(jsonable_encoder(result))
        if row.cache_ttl:
            response.headers["Cache-Control"] = f"public, max-age={row.cache_ttl}"
        return response
    except ParamError as e:
        status_code, error = 400, str(e)
        return JSONResponse({"detail": "Invalid parameters", "errors": e.errors}, status_code=400)
    except HTTPException as e:
        status_code, error = e.status_code, str(e.detail)
        return JSONResponse({"detail": e.detail}, status_code=e.status_code, headers=e.headers)
    except ConnectorError as e:
        status_code, error = 502, str(e)
        logger.error("API %s failed: %s", row.slug, e)
        return JSONResponse({"detail": "The data source could not complete the request"}, 502)
    except Exception as e:
        status_code, error = 500, str(e)
        logger.exception("API %s failed", row.slug)
        return JSONResponse({"detail": "Internal server error"}, status_code=500)
    finally:
        _log_call(row.slug, user_id, key_id, status_code, started, error)
