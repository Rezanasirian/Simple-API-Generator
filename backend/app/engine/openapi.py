"""OpenAPI documentation for generated APIs, merged into the app's /openapi.json."""

from typing import Any

from app.schemas import LIST_OPERATORS, NULL_OPERATORS, ApiDefinitionBase, DataType

_TYPES = {
    DataType.STRING: {"type": "string"},
    DataType.INTEGER: {"type": "integer"},
    DataType.NUMBER: {"type": "number"},
    DataType.BOOLEAN: {"type": "boolean"},
    DataType.DATE: {"type": "string", "format": "date"},
}


def _param_schema(cond) -> dict[str, Any]:
    if cond.operator in NULL_OPERATORS:
        schema: dict[str, Any] = {"type": "boolean"}
    else:
        schema = dict(_TYPES[cond.data_type])
        v = cond.validation
        if v.min is not None:
            schema["minimum"] = v.min
        if v.max is not None:
            schema["maximum"] = v.max
        if v.min_length is not None:
            schema["minLength"] = v.min_length
        if v.max_length is not None:
            schema["maxLength"] = v.max_length
        if v.pattern:
            schema["pattern"] = v.pattern
        if v.allowed_values:
            schema["enum"] = v.allowed_values
        if cond.operator in LIST_OPERATORS:
            schema = {"oneOf": [{"type": "array", "items": schema}, {"type": "string"}]}
    description = cond.description or cond.display_name or cond.parameter
    description += f" — filters `{cond.column}` with `{cond.operator.value}`"
    if cond.ignore_if is not None:
        description += f"; the value `{cond.ignore_if}` disables the filter"
    schema["description"] = description
    return schema


def api_paths(apis: list[ApiDefinitionBase]) -> dict[str, Any]:
    paths: dict[str, Any] = {}
    for api in apis:
        props = {c.parameter: _param_schema(c) for c in api.conditions}
        props["limit"] = {"type": "integer", "default": api.default_limit, "maximum": api.max_limit}
        props["offset"] = {"type": "integer", "default": 0}
        props["order_by"] = {"type": "string", "default": api.default_order_field}
        props["order_direction"] = {"type": "string", "enum": ["ASC", "DESC"]}
        required = [c.parameter for c in api.conditions if c.required]
        body: dict[str, Any] = {"type": "object", "properties": props}
        if required:
            body["required"] = required

        row = {"type": "object"}
        if api.response_fields:
            names = list(api.response_fields) + [t.target for t in api.response_transforms]
            row["properties"] = {n: {} for n in names}

        operation: dict[str, Any] = {
            "tags": ["Generated APIs"],
            "summary": api.name or api.slug,
            "description": api.description,
            "operationId": f"generated_{api.slug}",
            "requestBody": {"content": {"application/json": {"schema": body}}},
            "responses": {
                "200": {
                    "description": "Matching rows",
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "api": {"type": "string"},
                                    "version": {"type": "string"},
                                    "data": {"type": "array", "items": row},
                                    "pagination": {
                                        "$ref": "#/components/schemas/GeneratedPagination"
                                    },
                                },
                            }
                        }
                    },
                },
                "400": {"description": "Invalid parameters"},
                "401": {"description": "Missing or invalid API key"},
                "502": {"description": "The data source failed"},
            },
        }
        if api.require_api_key:
            operation["security"] = [{"ApiKeyHeader": []}]
        paths[f"/api/{api.slug}"] = {"post": operation}
    return paths


COMPONENTS = {
    "schemas": {
        "GeneratedPagination": {
            "type": "object",
            "properties": {
                "limit": {"type": "integer"},
                "offset": {"type": "integer"},
                "total": {"type": "integer"},
                "page": {"type": "integer"},
                "total_pages": {"type": "integer"},
            },
        }
    },
    "securitySchemes": {"ApiKeyHeader": {"type": "apiKey", "in": "header", "name": "X-API-Key"}},
}
