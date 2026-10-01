"""Validation and type coercion of request parameters against an API's conditions."""

import re
from datetime import date, datetime
from typing import Any

from app.schemas import LIST_OPERATORS, NULL_OPERATORS, Condition, DataType

TRUE_VALUES = {"true", "1", "yes", "on"}
FALSE_VALUES = {"false", "0", "no", "off"}


class ParamError(ValueError):
    def __init__(self, errors: dict[str, str]):
        super().__init__("; ".join(f"{k}: {v}" for k, v in errors.items()))
        self.errors = errors


def _coerce(value: Any, data_type: DataType) -> Any:
    if data_type == DataType.STRING:
        if isinstance(value, (dict, list)):
            raise ValueError("must be a string")
        return str(value)
    if data_type == DataType.INTEGER:
        if isinstance(value, bool):
            raise ValueError("must be an integer")
        if isinstance(value, float):
            if not value.is_integer():
                raise ValueError("must be an integer")
            return int(value)
        try:
            return int(str(value).strip())
        except ValueError:
            raise ValueError("must be an integer") from None
    if data_type == DataType.NUMBER:
        if isinstance(value, bool):
            raise ValueError("must be a number")
        try:
            return float(str(value).strip())
        except ValueError:
            raise ValueError("must be a number") from None
    if data_type == DataType.BOOLEAN:
        return _to_bool(value)
    if data_type == DataType.DATE:
        text = str(value).strip()
        try:
            if len(text) == 10:
                return date.fromisoformat(text)
            return datetime.fromisoformat(text)
        except ValueError:
            raise ValueError("must be an ISO date (YYYY-MM-DD) or datetime") from None
    raise ValueError(f"unsupported data type {data_type}")


def _to_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    text = str(value).strip().lower()
    if text in TRUE_VALUES:
        return True
    if text in FALSE_VALUES:
        return False
    raise ValueError("must be true or false")


def _check_rules(value: Any, cond: Condition) -> None:
    rules = cond.validation
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if rules.min is not None and value < rules.min:
            raise ValueError(f"must be at least {rules.min:g}")
        if rules.max is not None and value > rules.max:
            raise ValueError(f"must be at most {rules.max:g}")
    if isinstance(value, str):
        if rules.min_length is not None and len(value) < rules.min_length:
            raise ValueError(f"must be at least {rules.min_length} characters")
        if rules.max_length is not None and len(value) > rules.max_length:
            raise ValueError(f"must be at most {rules.max_length} characters")
        if rules.pattern and not re.fullmatch(rules.pattern, value):
            raise ValueError("has an invalid format")
    if rules.allowed_values and str(value) not in rules.allowed_values:
        raise ValueError(f"must be one of: {', '.join(rules.allowed_values)}")


def resolve_params(conditions: list[Condition], body: dict[str, Any]) -> dict[str, Any]:
    """Return {parameter: coerced value} for every condition that should be applied.

    Conditions whose parameter is missing, empty or equal to `ignore_if` are left out.
    Raises ParamError listing every invalid parameter.
    """
    resolved: dict[str, Any] = {}
    errors: dict[str, str] = {}

    for cond in conditions:
        raw = body.get(cond.parameter)
        if raw is None or raw == "" or raw == []:
            if cond.required:
                errors[cond.parameter] = "is required"
            continue
        if cond.ignore_if is not None and not isinstance(raw, list) and str(raw) == cond.ignore_if:
            continue

        try:
            if cond.operator in NULL_OPERATORS:
                # The parameter switches the IS NULL filter on or off.
                if _to_bool(raw):
                    resolved[cond.parameter] = True
                continue
            if cond.operator in LIST_OPERATORS:
                items = raw if isinstance(raw, list) else str(raw).split(",")
                items = [i.strip() if isinstance(i, str) else i for i in items]
                values = [_coerce(i, cond.data_type) for i in items if i != ""]
                for v in values:
                    _check_rules(v, cond)
                if not values:
                    continue
                resolved[cond.parameter] = values
            else:
                if isinstance(raw, list):
                    raise ValueError("must be a single value")
                value = _coerce(raw, cond.data_type)
                _check_rules(value, cond)
                resolved[cond.parameter] = value
        except ValueError as e:
            errors[cond.parameter] = str(e)

    if errors:
        raise ParamError(errors)
    return resolved
