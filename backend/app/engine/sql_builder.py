"""Builds SQLAlchemy Core statements for SQL data sources.

Identifiers are quoted and values are bound as parameters by SQLAlchemy, so nothing from the
API definition or the request is ever pasted into SQL text.
"""

from typing import Any

import sqlalchemy as sa
from sqlalchemy.sql import ColumnElement, Select

from app.schemas import Condition, Operator

CAST_TYPES: dict[str, Any] = {
    "string": sa.String,
    "integer": sa.BigInteger,
    "number": sa.Float,
    "date": sa.Date,
    "timestamp": sa.DateTime,
    "boolean": sa.Boolean,
}


def _column_expr(cond: Condition) -> ColumnElement:
    expr: ColumnElement = sa.column(cond.column)
    t = cond.column_transform
    if t.cast:
        expr = sa.cast(expr, CAST_TYPES[t.cast])
    if t.substring:
        start, length = t.substring
        expr = sa.func.substring(expr, start, length)
    if t.trim:
        expr = sa.func.trim(expr)
    if t.replace:
        old, new = t.replace
        expr = sa.func.replace(expr, old, new)
    return expr


def _match_cast(value: Any, cast: str | None) -> Any:
    """Bring the request value to the type the column was cast to, so the comparison is valid."""
    if isinstance(value, list):
        return [_match_cast(v, cast) for v in value]
    if cast == "string" and not isinstance(value, bool):
        return str(value)
    if cast in ("integer", "number") and isinstance(value, str):
        try:
            return int(value) if cast == "integer" else float(value)
        except ValueError:
            return value
    return value


def _condition_clause(cond: Condition, value: Any) -> ColumnElement:
    col = _column_expr(cond)
    value = _match_cast(value, cond.column_transform.cast)
    op = cond.operator
    if op == Operator.EQ:
        return col == value
    if op == Operator.NE:
        return col != value
    if op == Operator.GT:
        return col > value
    if op == Operator.GE:
        return col >= value
    if op == Operator.LT:
        return col < value
    if op == Operator.LE:
        return col <= value
    if op == Operator.LIKE:
        return col.like(value)
    if op == Operator.NOT_LIKE:
        return col.not_like(value)
    if op == Operator.CONTAINS:
        return sa.func.lower(col).contains(str(value).lower(), autoescape=True)
    if op == Operator.STARTS_WITH:
        return sa.func.lower(col).startswith(str(value).lower(), autoescape=True)
    if op == Operator.IN:
        return col.in_(value)
    if op == Operator.NOT_IN:
        return col.not_in(value)
    if op == Operator.IS_NULL:
        return col.is_(None)
    if op == Operator.IS_NOT_NULL:
        return col.is_not(None)
    raise ValueError(f"unsupported operator {op}")


def build_where(conditions: list[Condition], params: dict[str, Any]) -> list[ColumnElement]:
    return [_condition_clause(c, params[c.parameter]) for c in conditions if c.parameter in params]


def build_queries(
    *,
    schema: str | None,
    table: str,
    fields: list[str],
    conditions: list[Condition],
    params: dict[str, Any],
    order_by: str | None,
    order_direction: str,
    limit: int,
    offset: int,
) -> tuple[Select, Select]:
    """Return (data query, count query)."""
    tbl = sa.table(table, schema=schema or None)
    where = build_where(conditions, params)

    columns = [sa.column(f) for f in fields] if fields else [sa.literal_column("*")]
    data = sa.select(*columns).select_from(tbl).where(*where)
    if order_by:
        order_col = sa.column(order_by)
        data = data.order_by(order_col.desc() if order_direction == "DESC" else order_col.asc())
    data = data.limit(limit).offset(offset)

    count = sa.select(sa.func.count()).select_from(tbl).where(*where)
    return data, count


def compile_for_display(stmt: Select, engine: sa.Engine) -> str:
    """Render a statement with its parameters inlined, for the debug view only."""
    try:
        return str(stmt.compile(engine, compile_kwargs={"literal_binds": True}))
    except Exception:
        return str(stmt.compile(engine))
