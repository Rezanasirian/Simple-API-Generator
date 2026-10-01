"""Runs a generated API: validates parameters, queries the data source and shapes the result."""

import re
from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from app.engine import connectors, mongo_builder, sql_builder
from app.engine.connectors import ConnectorError
from app.engine.params import ParamError, resolve_params
from app.engine.transforms import shape_rows, source_fields
from app.schemas import ApiDefinitionBase, DataSourceType

__all__ = ["ApiRequest", "ConnectorError", "ParamError", "run_api"]


@dataclass
class ApiRequest:
    params: dict[str, Any]
    limit: int | None = None
    offset: int = 0
    order_by: str | None = None
    order_direction: str | None = None
    include_query: bool = False


def _jsonable(value: Any) -> Any:
    if isinstance(value, Decimal):
        return int(value) if value == value.to_integral_value() else float(value)
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    if isinstance(value, dict):
        return {k: _jsonable(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_jsonable(v) for v in value]
    if isinstance(value, re.Pattern):
        return value.pattern
    if type(value).__name__ == "ObjectId":
        return str(value)
    return value


def _paging(api: ApiDefinitionBase, req: ApiRequest) -> tuple[int, int, str | None, str]:
    limit = req.limit if req.limit is not None else api.default_limit
    if limit < 1:
        raise ParamError({"limit": "must be at least 1"})
    limit = min(limit, api.max_limit)
    if req.offset < 0:
        raise ParamError({"offset": "cannot be negative"})

    order_by = req.order_by or api.default_order_field
    if req.order_by and api.response_fields and req.order_by not in api.response_fields:
        raise ParamError({"order_by": "must be one of the response fields"})
    direction = (req.order_direction or api.default_order_direction).upper()
    if direction not in ("ASC", "DESC"):
        raise ParamError({"order_direction": "must be ASC or DESC"})
    return limit, req.offset, order_by, direction


def run_api(api: ApiDefinitionBase, ds, req: ApiRequest) -> dict[str, Any]:
    """Execute `api` against data source row `ds`.

    Raises ParamError for bad input and ConnectorError when the database fails.
    """
    params = resolve_params(api.conditions, req.params)
    limit, offset, order_by, direction = _paging(api, req)

    fields = list(api.response_fields)
    if fields:
        fields += [f for f in source_fields(api.response_transforms) if f not in fields]

    query_text: Any = None
    try:
        conn = connectors.get_connection(ds)
        if ds.type == DataSourceType.MONGODB:
            collection = conn[api.database][api.table]
            flt = mongo_builder.build_filter(api.conditions, params)
            cursor = collection.find(flt, mongo_builder.build_projection(fields))
            if order_by:
                cursor = cursor.sort(order_by, 1 if direction == "ASC" else -1)
            rows = list(cursor.skip(offset).limit(limit))
            total = collection.count_documents(flt)
            query_text = {"filter": flt, "sort": order_by and {order_by: direction}}
        else:
            data_q, count_q = sql_builder.build_queries(
                schema=api.database,
                table=api.table,
                fields=fields,
                conditions=api.conditions,
                params=params,
                order_by=order_by,
                order_direction=direction,
                limit=limit,
                offset=offset,
            )
            with conn.connect() as c:
                rows = [dict(r) for r in c.execute(data_q).mappings()]
                total = c.execute(count_q).scalar_one()
            if req.include_query:
                query_text = sql_builder.compile_for_display(data_q, conn)
    except (ParamError, ConnectorError):
        raise
    except Exception as e:
        raise ConnectorError(str(e)) from e

    data = shape_rows([_jsonable(r) for r in rows], api.response_fields, api.response_transforms)
    response: dict[str, Any] = {
        "api": api.slug,
        "version": api.version,
        "data": data,
        "pagination": {
            "limit": limit,
            "offset": offset,
            "total": total,
            "page": offset // limit + 1,
            "total_pages": (total + limit - 1) // limit,
        },
        "ordering": {"field": order_by, "direction": direction},
    }
    if req.include_query:
        response["query"] = _jsonable(query_text)
    return response
