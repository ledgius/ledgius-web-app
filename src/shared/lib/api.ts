import { getAuthToken, getRefreshToken, setAuthToken, setRefreshTokenValue } from "./auth"

const API_BASE = "/api/v1"

let isRefreshing = false
let refreshPromise: Promise<boolean> | null = null

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
    if (!res.ok) return false
    const data = await res.json()
    if (data.access_token) {
      setAuthToken(data.access_token)
      if (data.refresh_token) {
        setRefreshTokenValue(data.refresh_token)
      }
      return true
    }
    return false
  } catch {
    return false
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  }

  // Attach auth token if available.
  const token = getAuthToken()
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  // Handle 401 — try token refresh, then retry once
  if (res.status === 401 && token) {
    // Deduplicate concurrent refresh attempts
    if (!isRefreshing) {
      isRefreshing = true
      refreshPromise = tryRefreshToken().finally(() => {
        isRefreshing = false
        refreshPromise = null
      })
    }

    const refreshed = await (refreshPromise ?? tryRefreshToken())
    if (refreshed) {
      // Retry with new token
      const newToken = getAuthToken()
      if (newToken) {
        headers["Authorization"] = `Bearer ${newToken}`
      }
      const retryRes = await fetch(`${API_BASE}${path}`, { ...options, headers })
      if (retryRes.ok) {
        if (retryRes.status === 204) return undefined as T
        return retryRes.json()
      }
    }

    // Refresh failed — clear auth state and redirect to login
    try { sessionStorage.removeItem("ledgius_auth") } catch {}
    setAuthToken(null)
    setRefreshTokenValue(null)
    window.location.href = "/login"
    throw new Error("Session expired — redirecting to login")
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message || `API error: ${res.status}`)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
}
