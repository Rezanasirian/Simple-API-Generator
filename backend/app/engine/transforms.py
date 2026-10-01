"""Computed response fields, applied in Python so they work the same for every data source."""

import re
from typing import Any

from app.schemas import ResponseTransform, ResponseTransformType

_PLACEHOLDER = re.compile(r"\{([\w .\-]+)\}")


def _text(value: Any) -> str:
    return "" if value is None else str(value)


def render_template(template: str, row: dict[str, Any]) -> str:
    """Replace {field} placeholders with row values; unknown fields render as ''."""
    return _PLACEHOLDER.sub(lambda m: _text(row.get(m.group(1).strip())), template)


def template_fields(template: str) -> list[str]:
    return [m.strip() for m in _PLACEHOLDER.findall(template)]


def source_fields(transforms: list[ResponseTransform]) -> list[str]:
    """Fields the transforms read, so the query can fetch them."""
    fields: list[str] = []
    for t in transforms:
        names = (
            template_fields(t.template or "")
            if t.type == ResponseTransformType.TEMPLATE
            else t.sources
        )
        fields.extend(n for n in names if n not in fields)
    return fields


def _compute(t: ResponseTransform, row: dict[str, Any]) -> Any:
    if t.type == ResponseTransformType.TEMPLATE:
        return render_template(t.template or "", row)
    if t.type == ResponseTransformType.CONCAT:
        return t.separator.join(_text(row.get(s)) for s in t.sources)

    value = row.get(t.sources[0])
    if t.type == ResponseTransformType.COPY:
        return value
    if value is None:
        return None
    text = str(value)
    if t.type == ResponseTransformType.UPPER:
        return text.upper()
    if t.type == ResponseTransformType.LOWER:
        return text.lower()
    if t.type == ResponseTransformType.TRIM:
        return text.strip()
    if t.type == ResponseTransformType.SUBSTRING:
        start = max((t.start or 1) - 1, 0)
        return text[start : start + (t.length or 0)]
    if t.type == ResponseTransformType.REPLACE:
        return text.replace(t.old or "", t.new or "")
    raise ValueError(f"unsupported transform {t.type}")


def shape_rows(
    rows: list[dict[str, Any]], fields: list[str], transforms: list[ResponseTransform]
) -> list[dict[str, Any]]:
    """Apply transforms, then keep only the configured fields plus the computed ones."""
    out = []
    for row in rows:
        computed = dict(row)
        for t in transforms:
            computed[t.target] = _compute(t, computed)
        if fields:
            keys = list(fields) + [t.target for t in transforms if t.target not in fields]
            computed = {k: computed.get(k) for k in keys}
        out.append(computed)
    return out
