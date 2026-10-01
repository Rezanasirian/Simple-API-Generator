const TOKEN_KEY = "sag-token"

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

export class ApiError extends Error {
  status: number
  detail: unknown

  constructor(status: number, detail: unknown) {
    super(formatDetail(detail))
    this.status = status
    this.detail = detail
  }
}

/** Turn FastAPI error bodies (string, validation list or {errors}) into one readable line. */
function formatDetail(detail: unknown): string {
  if (typeof detail === "string") return detail
  if (Array.isArray(detail)) {
    return detail
      .map((d: { loc?: (string | number)[]; msg?: string }) => {
        const loc = (d.loc ?? []).filter((p) => p !== "body").join(".")
        return loc ? `${loc}: ${d.msg}` : d.msg
      })
      .join("; ")
  }
  if (detail && typeof detail === "object" && "errors" in detail) {
    const errors = (detail as { errors: Record<string, string> }).errors
    return Object.entries(errors)
      .map(([k, v]) => `${k} ${v}`)
      .join("; ")
  }
  return "Request failed"
}

let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn
}

export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {}
  const token = tokenStore.get()
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers["Content-Type"] = "application/json"

  const res = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (res.status === 401 && token && path.startsWith("/admin-api") && !path.endsWith("/auth/login")) {
    onUnauthorized?.()
  }
  if (res.status === 204) return undefined as T
  const text = await res.text()
  const data = text ? JSON.parse(text) : undefined
  if (!res.ok) throw new ApiError(res.status, data?.detail ?? data ?? res.statusText)
  return data as T
}

const P = "/admin-api"

export const api = {
  get: <T>(path: string) => request<T>("GET", P + path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", P + path, body ?? {}),
  put: <T>(path: string, body: unknown) => request<T>("PUT", P + path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", P + path, body),
  del: (path: string) => request<void>("DELETE", P + path),
}
