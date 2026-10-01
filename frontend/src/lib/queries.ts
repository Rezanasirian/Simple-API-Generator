import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { api } from "@/lib/api"
import type {
  ApiDefinition,
  ApiKey,
  ApiSummary,
  ColumnInfo,
  DataSource,
  MetricsOverview,
  User,
} from "@/lib/types"

export const keys = {
  apis: ["apis"] as const,
  api: (id: number) => ["apis", id] as const,
  dataSources: ["data-sources"] as const,
  databases: (id: number) => ["data-sources", id, "databases"] as const,
  tables: (id: number, db: string) => ["data-sources", id, "tables", db] as const,
  columns: (id: number, db: string, table: string) => ["data-sources", id, "columns", db, table] as const,
  apiKeys: ["api-keys"] as const,
  users: ["users"] as const,
  metrics: (days: number) => ["metrics", days] as const,
}

export const useApis = () => useQuery({ queryKey: keys.apis, queryFn: () => api.get<ApiSummary[]>("/apis") })

export const useApi = (id: number | null) =>
  useQuery({
    queryKey: keys.api(id ?? 0),
    queryFn: () => api.get<ApiDefinition>(`/apis/${id}`),
    enabled: id !== null,
  })

export const useDataSources = () =>
  useQuery({ queryKey: keys.dataSources, queryFn: () => api.get<DataSource[]>("/data-sources") })

export const useDatabases = (dsId: number | null) =>
  useQuery({
    queryKey: keys.databases(dsId ?? 0),
    queryFn: () => api.get<string[]>(`/data-sources/${dsId}/databases`),
    enabled: !!dsId,
    retry: false,
    staleTime: 60_000,
  })

export const useTables = (dsId: number | null, database: string, enabled = true) =>
  useQuery({
    queryKey: keys.tables(dsId ?? 0, database),
    queryFn: () =>
      api.get<string[]>(`/data-sources/${dsId}/tables?${new URLSearchParams(database ? { database } : {})}`),
    enabled: !!dsId && enabled,
    retry: false,
    staleTime: 60_000,
  })

export const useColumns = (dsId: number | null, database: string, table: string) =>
  useQuery({
    queryKey: keys.columns(dsId ?? 0, database, table),
    queryFn: () =>
      api.get<ColumnInfo[]>(
        `/data-sources/${dsId}/columns?${new URLSearchParams({ table, ...(database ? { database } : {}) })}`,
      ),
    enabled: !!dsId && !!table,
    retry: false,
    staleTime: 60_000,
  })

export const useApiKeys = () => useQuery({ queryKey: keys.apiKeys, queryFn: () => api.get<ApiKey[]>("/api-keys") })

export const useUsers = () => useQuery({ queryKey: keys.users, queryFn: () => api.get<User[]>("/users") })

export const useMetrics = (days: number) =>
  useQuery({
    queryKey: keys.metrics(days),
    queryFn: () => api.get<MetricsOverview>(`/metrics/overview?days=${days}`),
    refetchInterval: 30_000,
  })

/** A mutation that shows a toast on error and invalidates the given query keys on success. */
export function useAction<TVars, TResult = unknown>(
  fn: (vars: TVars) => Promise<TResult>,
  opts: { invalidate?: readonly (readonly unknown[])[]; success?: string; onSuccess?: (r: TResult) => void } = {},
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (result) => {
      opts.invalidate?.forEach((k) => qc.invalidateQueries({ queryKey: k }))
      if (opts.success) toast.success(opts.success)
      opts.onSuccess?.(result)
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
