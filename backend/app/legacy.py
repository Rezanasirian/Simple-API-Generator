"""Conversion of the Flask version's config/ApiDoc.json into the new API definition format."""

import re
from typing import Any

from app.schemas import ApiDefinitionIn, DataType, Operator

_OPERATORS = {op.value: op for op in Operator} | {"<>": Operator.NE, "==": Operator.EQ}
_DATA_TYPES = {
    "string": DataType.STRING,
    "str": DataType.STRING,
    "integer": DataType.INTEGER,
    "int": DataType.INTEGER,
    "float": DataType.NUMBER,
    "number": DataType.NUMBER,
    "decimal": DataType.NUMBER,
    "boolean": DataType.BOOLEAN,
    "bool": DataType.BOOLEAN,
    "date": DataType.DATE,
    "datetime": DataType.DATE,
}


def _pick(d: dict, *keys: str, default: Any = None) -> Any:
    for k in keys:
        if d.get(k) not in (None, ""):
            return d[k]
    return default


def concat_to_template(expr: str) -> str | None:
    """CONCAT(a, '-', b) -> "{a}-{b}"."""
    m = re.fullmatch(r"\s*CONCAT\s*\((.*)\)\s*", expr, re.IGNORECASE | re.DOTALL)
    if not m:
        return None
    parts = re.findall(r"'((?:[^']|'')*)'|([^,\s][^,]*)", m.group(1))
    out = []
    for literal, field in parts:
        if field:
            out.append("{" + field.strip() + "}")
        else:
            out.append(literal.replace("''", "'"))
    return "".join(out)


def _condition(param: str, c: dict) -> dict:
    t = c.get("transformations") or {}
    transform: dict[str, Any] = {}
    if t.get("cast"):
        cast = str(t["cast"]).lower()
        transform["cast"] = {"varchar": "string", "int": "integer", "bigint": "integer"}.get(
            cast, cast
        )
    if isinstance(t.get("substring"), list) and len(t["substring"]) >= 2:
        transform["substring"] = t["substring"][:2]
    if t.get("trim"):
        transform["trim"] = True
    if isinstance(t.get("replace"), list) and len(t["replace"]) >= 2:
        transform["replace"] = [str(x) for x in t["replace"][:2]]

    ignore_if = _pick(c, "ignoreIf", "IgnoreIf", "Default")
    return {
        "parameter": _pick(c, "parameter", "Parameter", default=param),
        "display_name": _pick(c, "display_name", "name", "Name", default=""),
        "description": c.get("description", ""),
        "category": c.get("category", ""),
        "column": _pick(c, "column", "Column"),
        "operator": _OPERATORS.get(str(_pick(c, "operator", "Operator", default="=")).upper(), "="),
        "data_type": _DATA_TYPES.get(str(c.get("data_type", "string")).lower(), DataType.STRING),
        "required": bool(c.get("required", False)),
        "ignore_if": None if ignore_if is None else str(ignore_if),
        "validation": {k: v for k, v in (c.get("validation") or {}).items() if v is not None},
        "column_transform": transform,
    }


def convert_api(slug: str, cfg: dict, data_source_id: int) -> tuple[ApiDefinitionIn, list[str]]:
    """Return the converted definition and a list of warnings about dropped settings."""
    warnings: list[str] = []
    db = cfg.get("database") or {}
    pagination = cfg.get("pagination") or {}
    ordering = cfg.get("ordering") or {}
    cache = cfg.get("cache") or {}
    response = cfg.get("response") or {}

    conditions = []
    raw_conditions = cfg.get("conditions") or cfg.get("Conditions") or []
    if isinstance(raw_conditions, dict):
        raw_conditions = [raw_conditions]
    for group in raw_conditions:
        for param, c in group.items():
            if isinstance(c, dict):
                conditions.append(_condition(param, c))

    transforms = []
    for item in response.get("transformations") or cfg.get("transformations") or []:
        if not isinstance(item, dict):
            continue
        for target, expr in item.items():
            template = concat_to_template(str(expr))
            if template is None:
                warnings.append(f"{slug}: could not convert transformation {target} = {expr}")
                continue
            transforms.append({"target": target, "type": "template", "template": template})

    if cfg.get("lastUpdateTableName") or db.get("last_update_table"):
        warnings.append(f"{slug}: 'last update table' is no longer supported and was dropped")

    max_limit = int(pagination.get("max_limit") or 1000)
    definition = ApiDefinitionIn.model_validate(
        {
            "slug": slug,
            "name": cfg.get("name") or slug,
            "description": cfg.get("description", ""),
            "version": cfg.get("version") or "1.0.0",
            "data_source_id": data_source_id,
            "database": db.get("name") or db.get("schema") or "",
            "table": db.get("table") or cfg.get("TableName"),
            "default_limit": min(int(pagination.get("default_limit") or 50), max_limit),
            "max_limit": max_limit,
            "default_order_field": ordering.get("default_field") or cfg.get("OrderBy") or None,
            "default_order_direction": str(
                ordering.get("default_direction") or cfg.get("OrderType") or "ASC"
            ).upper(),
            "cache_ttl": int(cache.get("ttl") or 0) if cache.get("enabled") else 0,
            "conditions": conditions,
            "response_fields": response.get("fields") or cfg.get("response_fields") or [],
            "response_transforms": transforms,
        }
    )
    return definition, warnings
