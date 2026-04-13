import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useAuth, setAuthToken, setRefreshTokenValue } from "@/shared/lib/auth"

const API_BASE = "/api/v1"

export function LoginPage() {
  const { login, isLoading, tenants, switchTenant, isAuthenticated, currentTenantId } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [motivation, setMotivation] = useState("")
  const [showTenantPicker, setShowTenantPicker] = useState(false)

  // Fetch motivational message
  useEffect(() => {
    fetch(`${API_BASE}/motivation`)
      .then(r => r.json())
      .then(d => setMotivation(d.message))
      .catch(() => setMotivation("Your books are in good hands. Let's get things done."))
  }, [])

  // Handle SSO callback — tokens arrive in URL params
  useEffect(() => {
    const accessToken = searchParams.get("access_token")
    const refreshToken = searchParams.get("refresh_token")
    const ssoError = searchParams.get("sso_error")

    if (ssoError) {
      setError(`SSO login failed: ${decodeURIComponent(ssoError)}`)
      return
    }

    if (accessToken) {
      setAuthToken(accessToken)
      if (refreshToken) setRefreshTokenValue(refreshToken)
      // Force page reload to pick up the new auth state
      window.location.href = "/"
    }
  }, [searchParams])

  const handleLogin = async () => {
    setError("")
    try {
      await login(email, password)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed")
    }
  }

  // After login, check if we need tenant selection.
  if (isAuthenticated && !currentTenantId && tenants.length > 1 && !showTenantPicker) {
    setShowTenantPicker(true)
  }

  // If authenticated with a tenant, redirect to dashboard.
  if (isAuthenticated && currentTenantId) {
    navigate("/")
    return null
  }

  const handleSelectTenant = async (tenantId: string) => {
    try {
      await switchTenant(tenantId)
      navigate("/")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to switch tenant")
    }
  }

  const handleGoogleSSO = () => {
    window.location.href = `${API_BASE}/auth/google`
  }

  const handleMicrosoftSSO = () => {
    window.location.href = `${API_BASE}/auth/microsoft`
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white border border-gray-100 rounded-2xl p-8 w-full max-w-sm shadow-xl shadow-gray-200/60">
        <div className="flex justify-center mb-3">
          <img src="/brand/logo/ledgius-400x120-transparent.png" alt="Ledgius" className="h-10 w-auto" />
        </div>
        <p className="text-sm text-gray-500 mb-1 text-center">Sign in to your account</p>
        {motivation && <p className="text-xs text-primary-600/70 mb-6 text-center italic">{motivation}</p>}

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md">{error}</div>}

        {!showTenantPicker ? (
          <div className="space-y-4">
            {/* SSO Buttons */}
            <button
              onClick={handleGoogleSSO}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <button
              onClick={handleMicrosoftSSO}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 21 21">
                <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
              </svg>
              Continue with Microsoft
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-gray-400">or sign in with email</span>
              </div>
            </div>

            {/* Email form */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="you@example.com"
                onKeyDown={e => e.key === "Enter" && handleLogin()} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                onKeyDown={e => e.key === "Enter" && handleLogin()} />
            </div>
            <button onClick={handleLogin} disabled={isLoading}
              className="w-full py-2.5 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors">
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Select an organisation:</p>
            {tenants.map(m => (
              <button key={m.tenant_id} onClick={() => handleSelectTenant(m.tenant_id)}
                className="w-full text-left px-4 py-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <p className="font-medium text-sm">{m.tenant?.display_name ?? m.tenant_id}</p>
                <p className="text-xs text-gray-500">Role: {m.role}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
