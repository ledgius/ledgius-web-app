import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"

const API_BASE = "/api/v1"

interface User {
  id: string
  email: string
  display_name: string
  is_platform_admin: boolean
}

interface TenantMembership {
  id: string
  tenant_id: string
  role: string
  tenant?: { id: string; slug: string; display_name: string }
}

interface AuthState {
  user: User | null
  currentTenantId: string | null
  currentRole: string | null
  tenants: TenantMembership[]
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>
  switchTenant: (tenantId: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

const initialState: AuthState = {
  user: null,
  currentTenantId: null,
  currentRole: null,
  tenants: [],
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState)
  const [isLoading, setIsLoading] = useState(false)

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Login failed" }))
        throw new Error(err.message)
      }
      const data = await res.json()
      setState({
        user: data.user,
        currentTenantId: data.tenants?.length === 1 ? data.tenants[0].tenant_id : null,
        currentRole: data.tenants?.length === 1 ? data.tenants[0].role : null,
        tenants: data.tenants ?? [],
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        isAuthenticated: true,
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  const switchTenant = useCallback(async (tenantId: string) => {
    if (!state.accessToken) return
    setIsLoading(true)
    try {
      const res = await fetch(`${API_BASE}/auth/switch-tenant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${state.accessToken}`,
        },
        body: JSON.stringify({ tenant_id: tenantId }),
      })
      if (!res.ok) throw new Error("Failed to switch tenant")
      const data = await res.json()
      const membership = data.tenants?.find((t: TenantMembership) => t.tenant_id === tenantId)
      setState(prev => ({
        ...prev,
        currentTenantId: tenantId,
        currentRole: membership?.role ?? null,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tenants: data.tenants ?? prev.tenants,
      }))
    } finally {
      setIsLoading(false)
    }
  }, [state.accessToken])

  const logout = useCallback(() => {
    setState(initialState)
  }, [])

  return (
    <AuthContext.Provider value={{ ...state, login, switchTenant, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}

// Inject auth token into the API client fetch calls.
export function getAuthToken(): string | null {
  // This is read from a module-level variable set by the AuthProvider.
  // In a production app you'd use a more robust approach.
  return _currentToken
}

let _currentToken: string | null = null
let _refreshToken: string | null = null

export function setAuthToken(token: string | null) {
  _currentToken = token
}

export function getRefreshToken(): string | null {
  return _refreshToken
}

export function setRefreshTokenValue(token: string | null) {
  _refreshToken = token
}

// Hook to sync tokens to module-level variables.
export function useAuthTokenSync() {
  const { accessToken, refreshToken } = useAuth()
  useEffect(() => {
    setAuthToken(accessToken)
    setRefreshTokenValue(refreshToken)
  }, [accessToken, refreshToken])
}
