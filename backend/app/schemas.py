from datetime import datetime
from enum import StrEnum
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

# Table, column and database names. Values are always quoted by the query builders, so this
# only rejects names that cannot be real identifiers. \w includes non-ASCII letters.
FieldName = Annotated[str, StringConstraints(pattern=r"^\w[\w .\-]{0,199}$", strip_whitespace=True)]
# Request parameter names and API slugs appear in URLs and JSON bodies, so keep them ASCII.
ParamName = Annotated[str, StringConstraints(pattern=r"^[A-Za-z_][A-Za-z0-9_]{0,99}$")]
Slug = Annotated[str, StringConstraints(pattern=r"^[A-Za-z][A-Za-z0-9_\-]{0,99}$")]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --- Users & auth -------------------------------------------------------------------------

Role = Literal["admin", "user"]
Password = Annotated[str, StringConstraints(min_length=8, max_length=72)]


class UserOut(ORMModel):
    id: int
    username: str
    role: Role
    is_active: bool
    created_at: datetime


class UserCreate(BaseModel):
    username: Annotated[str, StringConstraints(pattern=r"^[\w.\-@]{3,150}$")]
    password: Password
    role: Role = "user"


class UserUpdate(BaseModel):
    role: Role | None = None
    is_active: bool | None = None
    password: Password | None = None


class LoginIn(BaseModel):
    username: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class PasswordChange(BaseModel):
    current_password: str
    new_password: Password


class ApiKeyOut(ORMModel):
    id: int
    name: str
    prefix: str
    is_active: bool
    created_at: datetime
    last_used_at: datetime | None


class ApiKeyCreate(BaseModel):
    name: Annotated[str, StringConstraints(min_length=1, max_length=100, strip_whitespace=True)]


class ApiKeyCreated(ApiKeyOut):
    key: str


# --- Data sources -------------------------------------------------------------------------


class DataSourceType(StrEnum):
    MONGODB = "mongodb"
    MYSQL = "mysql"
    POSTGRESQL = "postgresql"
    TRINO = "trino"
    SQLITE = "sqlite"


SQL_TYPES = {
    DataSourceType.MYSQL,
    DataSourceType.POSTGRESQL,
    DataSourceType.TRINO,
    DataSourceType.SQLITE,
}


class DataSourceConfig(BaseModel):
    """Connection settings. Which fields are used depends on the data source type."""

    # Full connection string (MongoDB URI or SQLAlchemy URL); overrides host/port/credentials.
    uri: str | None = None
    host: str | None = None
    port: int | None = None
    username: str | None = None
    password: str | None = None
    # Default database (MongoDB, MySQL, PostgreSQL) or catalog (Trino).
    database: str | None = None
    # SQLite file path.
    path: str | None = None
    # MongoDB
    auth_source: str | None = None
    auth_mechanism: str | None = None
    # Trino
    http_scheme: Literal["http", "https"] | None = None
    verify_ssl: bool = True


class DataSourceIn(BaseModel):
    name: Annotated[str, StringConstraints(min_length=1, max_length=100, strip_whitespace=True)]
    type: DataSourceType
    config: DataSourceConfig


class DataSourceOut(ORMModel):
    id: int
    name: str
    type: DataSourceType
    config: DataSourceConfig
    has_password: bool = False
    api_count: int = 0
    created_at: datetime
    updated_at: datetime


class ConnectionTestResult(BaseModel):
    ok: bool
    message: str


class ColumnInfo(BaseModel):
    name: str
    type: str


# --- API definitions ----------------------------------------------------------------------


class Operator(StrEnum):
    EQ = "="
    NE = "!="
    GT = ">"
    GE = ">="
    LT = "<"
    LE = "<="
    LIKE = "LIKE"
    NOT_LIKE = "NOT LIKE"
    CONTAINS = "CONTAINS"
    STARTS_WITH = "STARTS WITH"
    IN = "IN"
    NOT_IN = "NOT IN"
    IS_NULL = "IS NULL"
    IS_NOT_NULL = "IS NOT NULL"


LIST_OPERATORS = {Operator.IN, Operator.NOT_IN}
NULL_OPERATORS = {Operator.IS_NULL, Operator.IS_NOT_NULL}


class DataType(StrEnum):
    STRING = "string"
    INTEGER = "integer"
    NUMBER = "number"
    BOOLEAN = "boolean"
    DATE = "date"


class Validation(BaseModel):
    min: float | None = None
    max: float | None = None
    min_length: int | None = None
    max_length: int | None = None
    pattern: str | None = None
    allowed_values: list[str] | None = None


CastType = Literal["string", "integer", "number", "date", "timestamp", "boolean"]


class ColumnTransform(BaseModel):
    """SQL functions applied to the column before it is compared (SQL data sources only)."""

    cast: CastType | None = None
    substring: tuple[int, int] | None = None
    trim: bool = False
    replace: tuple[str, str] | None = None

    def is_empty(self) -> bool:
        return not (self.cast or self.substring or self.trim or self.replace)


class Condition(BaseModel):
    """A request parameter and the filter it applies."""

    parameter: ParamName
    display_name: str = ""
    description: str = ""
    category: str = ""
    column: FieldName
    operator: Operator = Operator.EQ
    data_type: DataType = DataType.STRING
    required: bool = False
    # When the request sends exactly this value, the filter is skipped (e.g. "All" or "-1").
    ignore_if: str | None = None
    validation: Validation = Field(default_factory=Validation)
    column_transform: ColumnTransform = Field(default_factory=ColumnTransform)


class ResponseTransformType(StrEnum):
    TEMPLATE = "template"
    CONCAT = "concat"
    UPPER = "upper"
    LOWER = "lower"
    TRIM = "trim"
    SUBSTRING = "substring"
    REPLACE = "replace"
    COPY = "copy"


class ResponseTransform(BaseModel):
    """A computed field added to every row of the response."""

    target: FieldName
    type: ResponseTransformType
    sources: list[FieldName] = Field(default_factory=list)
    # template: "{year}-{month}-01"
    template: str | None = None
    # concat
    separator: str = ""
    # substring (1-based start, like SQL)
    start: int | None = None
    length: int | None = None
    # replace
    old: str | None = None
    new: str | None = None

    @model_validator(mode="after")
    def check_params(self):
        t = self.type
        if t == ResponseTransformType.TEMPLATE:
            if not self.template:
                raise ValueError("template transform needs a template")
        elif not self.sources:
            raise ValueError(f"{t} transform needs at least one source field")
        if t == ResponseTransformType.SUBSTRING and (self.start is None or self.length is None):
            raise ValueError("substring transform needs start and length")
        if t == ResponseTransformType.REPLACE and self.old is None:
            raise ValueError("replace transform needs the text to replace")
        return self


class ApiDefinitionBase(BaseModel):
    slug: Slug
    name: str = ""
    description: str = ""
    version: str = "1.0.0"
    is_active: bool = True
    require_api_key: bool = True

    data_source_id: int
    database: Annotated[str, StringConstraints(pattern=r"^(\w[\w .\-]{0,199})?$")] = ""
    table: FieldName

    default_limit: int = Field(50, ge=1, le=10000)
    max_limit: int = Field(1000, ge=1, le=10000)
    default_order_field: FieldName | None = None
    default_order_direction: Literal["ASC", "DESC"] = "ASC"
    cache_ttl: int = Field(0, ge=0, description="Cache-Control max-age in seconds; 0 disables")

    conditions: list[Condition] = Field(default_factory=list)
    response_fields: list[FieldName] = Field(default_factory=list)
    response_transforms: list[ResponseTransform] = Field(default_factory=list)

    @model_validator(mode="after")
    def check_consistency(self):
        if self.default_limit > self.max_limit:
            raise ValueError("default_limit cannot be greater than max_limit")
        params = [c.parameter for c in self.conditions]
        duplicates = {p for p in params if params.count(p) > 1}
        if duplicates:
            raise ValueError(f"duplicate condition parameters: {', '.join(sorted(duplicates))}")
        reserved = {"limit", "offset", "order_by", "order_direction", "debug"}
        clash = reserved.intersection(params)
        if clash:
            raise ValueError(f"reserved parameter names: {', '.join(sorted(clash))}")
        return self


class ApiDefinitionIn(ApiDefinitionBase):
    pass


class ApiDefinitionOut(ApiDefinitionBase, ORMModel):
    id: int
    data_source_name: str
    data_source_type: DataSourceType
    created_at: datetime
    updated_at: datetime


class ApiSummary(ORMModel):
    id: int
    slug: str
    name: str
    description: str
    version: str
    is_active: bool
    require_api_key: bool
    data_source_id: int
    data_source_name: str
    data_source_type: DataSourceType
    table: str
    condition_count: int
    updated_at: datetime


class ApiTestRequest(BaseModel):
    params: dict = Field(default_factory=dict)
    limit: int | None = None
    offset: int = 0
    order_by: str | None = None
    order_direction: Literal["ASC", "DESC"] | None = None


class ApiExport(BaseModel):
    """Portable form of an API definition: the data source is referenced by name."""

    data_source: str
    api: dict


# --- Metrics ------------------------------------------------------------------------------


class DailyPoint(BaseModel):
    date: str
    success: int
    failed: int


class NamedCount(BaseModel):
    name: str
    value: float


class RecentError(BaseModel):
    api: str
    status_code: int
    message: str | None
    timestamp: datetime


class MetricsOverview(BaseModel):
    total_calls: int
    success_rate: float
    avg_response_ms: float
    api_count: int
    active_api_count: int
    daily: list[DailyPoint]
    top_apis: list[NamedCount]
    status_codes: list[NamedCount]
    slowest_apis: list[NamedCount]
    recent_errors: list[RecentError]
