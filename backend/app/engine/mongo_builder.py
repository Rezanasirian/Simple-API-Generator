"""Builds MongoDB filters from an API's conditions."""

import re
from datetime import date, datetime, time
from typing import Any

from app.schemas import Condition, Operator

_SIMPLE = {
    Operator.EQ: "$eq",
    Operator.NE: "$ne",
    Operator.GT: "$gt",
    Operator.GE: "$gte",
    Operator.LT: "$lt",
    Operator.LE: "$lte",
    Operator.IN: "$in",
    Operator.NOT_IN: "$nin",
}


def like_to_regex(pattern: str) -> str:
    """Translate a SQL LIKE pattern (% and _) into an anchored regular expression."""
    out = []
    for ch in pattern:
        if ch == "%":
            out.append(".*")
        elif ch == "_":
            out.append(".")
        else:
            out.append(re.escape(ch))
    return "^" + "".join(out) + "$"


def _bson_value(value: Any) -> Any:
    # BSON has no plain date type.
    if isinstance(value, date) and not isinstance(value, datetime):
        return datetime.combine(value, time.min)
    if isinstance(value, list):
        return [_bson_value(v) for v in value]
    return value


def _clause(cond: Condition, value: Any) -> dict[str, Any]:
    field = cond.column
    op = cond.operator
    value = _bson_value(value)
    if op in _SIMPLE:
        return {field: {_SIMPLE[op]: value}}
    if op == Operator.LIKE:
        return {field: {"$regex": like_to_regex(str(value))}}
    if op == Operator.NOT_LIKE:
        return {field: {"$not": re.compile(like_to_regex(str(value)))}}
    if op == Operator.CONTAINS:
        return {field: {"$regex": re.escape(str(value)), "$options": "i"}}
    if op == Operator.STARTS_WITH:
        return {field: {"$regex": "^" + re.escape(str(value)), "$options": "i"}}
    if op == Operator.IS_NULL:
        return {field: None}
    if op == Operator.IS_NOT_NULL:
        return {field: {"$ne": None}}
    raise ValueError(f"unsupported operator {op}")


def build_filter(conditions: list[Condition], params: dict[str, Any]) -> dict[str, Any]:
    clauses = [_clause(c, params[c.parameter]) for c in conditions if c.parameter in params]
    if not clauses:
        return {}
    if len(clauses) == 1:
        return clauses[0]
    return {"$and": clauses}


def build_projection(fields: list[str]) -> dict[str, int]:
    if not fields:
        return {"_id": 0}
    projection = {f: 1 for f in fields}
    if "_id" not in projection:
        projection["_id"] = 0
    return projection
