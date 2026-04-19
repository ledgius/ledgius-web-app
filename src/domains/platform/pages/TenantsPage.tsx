// Spec references: R-0068 (PA-060 through PA-065), A-0038.
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { PageShell } from "@/components/layout"
import { InfoPanel, Skeleton } from "@/components/primitives"
import { DateValue, StatusPill } from "@/components/financial"
import { usePageHelp } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { api } from "@/shared/lib/api"
import { Search, Building2, Users, FlaskConical } from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface Tenant {
  id: string
  slug: string
  display_name: string
  abn: string | null
  legal_name: string | null
  status: string
  is_test: boolean
  business_type: string | null
  trading_name: string | null
  address_state: string | null
  address_city: string | null
  plan_id: number | null
  trial_ends_at: string | null
  created_at: string
  user_count: number
}

function statusSemantic(status: string): "muted" | "info" | "active" | "warning" | "success" | "danger" {
  switch (status) {
    case "active": return "success"
    case "trial": return "info"
    case "provisioning": return "active"
    case "suspended": return "warning"
    case "pending": return "muted"
    case "deleted": case "cancelled": return "danger"
    default: return "muted"
  }
}

export function TenantsPage() {
  usePageHelp(undefined)
  usePagePolicies(["platform"])
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [filterTest, setFilterTest] = useState<string>("")

  const { data: tenants, isLoading } = useQuery({
    queryKey: ["platform", "tenants", filterStatus, filterTest],
    queryFn: () => {
      const params = new URLSearchParams()
      if (filterStatus) params.set("status", filterStatus)
      if (filterTest) params.set("is_test", filterTest)
      const qs = params.toString()
      return api.get<Tenant[]>(`/platform/tenants${qs ? `?${qs}` : ""}`)
    },
  })

  const filtered = (tenants ?? []).filter((t) => {
    if (!search) return true
    const s = search.toLowerCase()
    return t.display_name.toLowerCase().includes(s)
      || t.slug.toLowerCase().includes(s)
      || (t.abn ?? "").includes(s)
      || (t.address_city ?? "").toLowerCase().includes(s)
  })

  const counts = {
    total: (tenants ?? []).length,
    active: (tenants ?? []).filter(t => t.status === "active").length,
    trial: (tenants ?? []).filter(t => t.status === "trial").length,
    test: (tenants ?? []).filter(t => t.is_test).length,
    real: (tenants ?? []).filter(t => !t.is_test).length,
  }

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Tenants</h1>
        <span className="text-sm text-gray-400">{counts.total} total · {counts.active} active · {counts.trial} trial · {counts.test} test · {counts.real} real</span>
      </div>
      <p className="text-sm text-gray-500">Manage tenant organisations</p>
    </div>
  )

  return (
    <PageShell header={header}>
      <InfoPanel title="Tenant management" storageKey="platform-tenants-info" collapsible>
        <p>View and manage all tenant organisations, their plans, users, and provisioning status.</p>
      </InfoPanel>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tenants..."
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-white border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="provisioning">Provisioning</option>
          <option value="suspended">Suspended</option>
          <option value="pending">Pending</option>
        </select>
        <select
          value={filterTest}
          onChange={(e) => setFilterTest(e.target.value)}
          className="bg-white border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Test & Real</option>
          <option value="false">Real only</option>
          <option value="true">Test only</option>
        </select>
      </div>

      {/* Tenant list */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-gray-400 text-center py-12">
          {search ? "No tenants match your search" : "No tenants"}
        </div>
      ) : (
        <div className="border border-gray-300 rounded-lg bg-white overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Tenant</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Location</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">Users</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, idx) => (
                <tr
                  key={t.id}
                  onClick={() => navigate(`/platform/tenants/${t.id}`)}
                  className={cn(
                    "border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors",
                    idx % 2 === 1 && "bg-gray-50/50"
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{t.display_name}</p>
                        <p className="text-xs text-gray-400 font-mono">{t.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {[t.address_city, t.address_state].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {t.is_test ? (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                        <FlaskConical className="h-3 w-3" />
                        Test
                      </span>
                    ) : (
                      <span className="text-xs text-green-600 font-medium">Real</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                      <Users className="h-3 w-3" />
                      {t.user_count}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={t.status} semantic={statusSemantic(t.status)} className="text-xs" />
                  </td>
                  <td className="px-4 py-3">
                    <DateValue value={t.created_at} format="short" className="text-xs text-gray-500" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  )
}
