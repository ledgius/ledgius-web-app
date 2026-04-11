import { useState } from "react"
import { useAuth } from "@/shared/lib/auth"
import { ChevronDown } from "lucide-react"

export function TenantSwitcher() {
  const { tenants, currentTenantId, switchTenant, user, currentRole, isAuthenticated, logout } = useAuth()
  const [open, setOpen] = useState(false)

  if (!isAuthenticated || tenants.length === 0) return null

  const currentTenant = tenants.find(t => t.tenant_id === currentTenantId)
  const currentName = currentTenant?.tenant?.display_name ?? "Select org..."

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-gray-50 transition-colors">
        <div className="text-left truncate">
          <p className="font-medium text-gray-900 truncate">{currentName}</p>
          <p className="text-[10px] text-gray-400">{user?.email} ({currentRole})</p>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-50">
          {tenants.length > 1 && tenants.map(m => (
            <button key={m.tenant_id}
              onClick={() => { switchTenant(m.tenant_id); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                m.tenant_id === currentTenantId ? "bg-gray-100 font-medium" : ""
              }`}>
              {m.tenant?.display_name ?? m.tenant_id}
              <span className="text-[10px] text-gray-400 ml-1">({m.role})</span>
            </button>
          ))}
          <div className="border-t">
            <button onClick={() => { logout(); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50">
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
