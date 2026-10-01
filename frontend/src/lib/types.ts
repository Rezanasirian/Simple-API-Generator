export type Role = "admin" | "user"

export interface User {
  id: number
  username: string
  role: Role
  is_active: boolean
  created_at: string
}

export interface ApiKey {
  id: number
  name: string
  prefix: string
  is_active: boolean
  created_at: string
  last_used_at: string | null
}

export type DataSourceType = "mongodb" | "mysql" | "postgresql" | "trino" | "sqlite"

export interface DataSourceConfig {
  uri?: string | null
  host?: string | null
  port?: number | null
  username?: string | null
  password?: string | null
  database?: string | null
  path?: string | null
  auth_source?: string | null
  auth_mechanism?: string | null
  http_scheme?: "http" | "https" | null
  verify_ssl?: boolean
}

export interface DataSource {
  id: number
  name: string
  type: DataSourceType
  config: DataSourceConfig
  has_password: boolean
  api_count: number
  created_at: string
  updated_at: string
}

export interface ColumnInfo {
  name: string
  type: string
}

export const OPERATORS = [
  "=", "!=", ">", ">=", "<", "<=", "LIKE", "NOT LIKE", "CONTAINS", "STARTS WITH",
  "IN", "NOT IN", "IS NULL", "IS NOT NULL",
] as const
export type Operator = (typeof OPERATORS)[number]

export const DATA_TYPES = ["string", "integer", "number", "boolean", "date"] as const
export type DataType = (typeof DATA_TYPES)[number]

export const CAST_TYPES = ["string", "integer", "number", "date", "timestamp", "boolean"] as const

export interface Validation {
  min?: number | null
  max?: number | null
  min_length?: number | null
  max_length?: number | null
  pattern?: string | null
  allowed_values?: string[] | null
}

export interface ColumnTransform {
  cast?: (typeof CAST_TYPES)[number] | null
  substring?: [number, number] | null
  trim?: boolean
  replace?: [string, string] | null
}

export interface Condition {
  parameter: string
  display_name: string
  description: string
  category: string
  column: string
  operator: Operator
  data_type: DataType
  required: boolean
  ignore_if: string | null
  validation: Validation
  column_transform: ColumnTransform
}

export const TRANSFORM_TYPES = ["template", "concat", "upper", "lower", "trim", "substring", "replace", "copy"] as const
export type TransformType = (typeof TRANSFORM_TYPES)[number]

export interface ResponseTransform {
  target: string
  type: TransformType
  sources: string[]
  template?: string | null
  separator?: string
  start?: number | null
  length?: number | null
  old?: string | null
  new?: string | null
}

export interface ApiDefinitionInput {
  slug: string
  name: string
  description: string
  version: string
  is_active: boolean
  require_api_key: boolean
  data_source_id: number
  database: string
  table: string
  default_limit: number
  max_limit: number
  default_order_field: string | null
  default_order_direction: "ASC" | "DESC"
  cache_ttl: number
  conditions: Condition[]
  response_fields: string[]
  response_transforms: ResponseTransform[]
}

export interface ApiDefinition extends ApiDefinitionInput {
  id: number
  data_source_name: string
  data_source_type: DataSourceType
  created_at: string
  updated_at: string
}

export interface ApiSummary {
  id: number
  slug: string
  name: string
  description: string
  version: string
  is_active: boolean
  require_api_key: boolean
  data_source_id: number
  data_source_name: string
  data_source_type: DataSourceType
  table: string
  condition_count: number
  updated_at: string
}

export interface ApiResult {
  api: string
  version: string
  data: Record<string, unknown>[]
  pagination: { limit: number; offset: number; total: number; page: number; total_pages: number }
  ordering: { field: string | null; direction: string }
  query?: unknown
}

export interface PreviewResponse {
  time_ms: number
  result: ApiResult
}

export interface NamedCount {
  name: string
  value: number
}

export interface MetricsOverview {
  total_calls: number
  success_rate: number
  avg_response_ms: number
  api_count: number
  active_api_count: number
  daily: { date: string; success: number; failed: number }[]
  top_apis: NamedCount[]
  status_codes: NamedCount[]
  slowest_apis: NamedCount[]
  recent_errors: { api: string; status_code: number; message: string | null; timestamp: string }[]
}
