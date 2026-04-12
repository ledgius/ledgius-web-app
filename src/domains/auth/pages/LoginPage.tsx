import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/shared/lib/auth"

export function LoginPage() {
  const { login, isLoading, tenants, switchTenant, isAuthenticated, currentTenantId } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [motivation, setMotivation] = useState("")

  useEffect(() => {
    fetch("/api/v1/motivation")
      .then(r => r.json())
      .then(d => setMotivation(d.message))
      .catch(() => setMotivation("Your books are in good hands. Let's get things done."))
  }, [])
  const [showTenantPicker, setShowTenantPicker] = useState(false)

  const handleLogin = async () => {
    setError("")
    try {
      await login(email, password)
      // If single tenant, navigate directly. If multi-tenant, show picker.
    } catch (err: any) {
      setError(err.message || "Login failed")
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
    } catch (err: any) {
      setError(err.message)
    }
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
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm" placeholder="you@example.com"
                onKeyDown={e => e.key === "Enter" && handleLogin()} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
                onKeyDown={e => e.key === "Enter" && handleLogin()} />
            </div>
            <button onClick={handleLogin} disabled={isLoading}
              className="w-full py-2 text-sm rounded-md bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50">
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Select an organisation:</p>
            {tenants.map(m => (
              <button key={m.tenant_id} onClick={() => handleSelectTenant(m.tenant_id)}
                className="w-full text-left px-4 py-3 border rounded-md hover:bg-gray-50 transition-colors">
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
