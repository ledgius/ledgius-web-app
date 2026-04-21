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
import {
  Search, Building2, Users, FlaskConical, CreditCard, MapPin,
  ChevronRight, AlertCircle, CheckCircle
} from "lucide-react"
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
  billing_state: string | null
  billing_city: string | null
  plan_id: number | null
  plan_name: string
  plan_slug: string
  trial_ends_at: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
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

function billingStatus(t: Tenant): { label: string; color: string } {
  if (t.is_test) return { label: "Not billed", color: "text-gray-400" }
  if (t.status === "trial") {
    const daysLeft = t.trial_ends_at
      ? Math.ceil((new Date(t.trial_ends_at).getTime() - Date.now()) / 86400000)
      : null
    return {
      label: daysLeft !== null ? `Trial (${daysLeft}d)` : "Trial",
      color: "text-blue-600",
    }
  }
  if (!t.stripe_subscription_id) return { label: "No subscription", color: "text-amber-600" }
  return { label: "Active", color: "text-green-600" }
}

export function TenantsPage() {
  usePageHelp(undefined)
  usePagePolicies(["platform"])
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [filterTest, setFilterTest] = useState("")
  const [filterState, setFilterState] = useState("")
  const [filterPlan, setFilterPlan] = useState("")

  const { data: tenants, isLoading } = useQuery({
    queryKey: ["platform", "tenants", filterStatus, filterTest, filterState, filterPlan],
    queryFn: () => {
      const params = new URLSearchParams()
      if (filterStatus) params.set("status", filterStatus)
      if (filterTest) params.set("is_test", filterTest)
      if (filterState) params.set("state", filterState)
      if (filterPlan) params.set("plan", filterPlan)
      const qs = params.toString()
      return api.get<Tenant[]>(`/platform/tenants${qs ? `?${qs}` : ""}`)
    },
  })

  const all = tenants ?? []

  // Client-side search filter
  const filtered = all.filter((t) => {
    if (!search) return true
    const s = search.toLowerCase()
    return t.display_name.toLowerCase().includes(s)
      || t.slug.toLowerCase().includes(s)
      || (t.abn ?? "").includes(s)
      || (t.billing_city ?? "").toLowerCase().includes(s)
      || (t.business_type ?? "").toLowerCase().includes(s)
  })

  // Compute stats
  const stats = {
    total: all.length,
    active: all.filter(t => t.status === "active").length,
    trial: all.filter(t => t.status === "trial").length,
    suspended: all.filter(t => t.status === "suspended").length,
    test: all.filter(t => t.is_test).length,
    real: all.filter(t => !t.is_test).length,
    totalUsers: all.reduce((sum, t) => sum + t.user_count, 0),
  }

  // Extract unique states and plans for filter dropdowns
  const states = [...new Set(all.map(t => t.billing_state).filter(Boolean) as string[])].sort()
  const plans = [...new Set(all.map(t => t.plan_slug).filter(Boolean) as string[])].sort()
  const planNameMap = Object.fromEntries(all.filter(t => t.plan_slug).map(t => [t.plan_slug, t.plan_name]))

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Tenants</h1>
        <span className="text-sm text-gray-400">{stats.total} total</span>
      </div>
      <p className="text-sm text-gray-500">Scan tenant portfolio — plans, billing, users, and status</p>
    </div>
  )

  return (
    <PageShell header={header}>
      <InfoPanel title="Tenant management" storageKey="platform-tenants-info" collapsible>
        <p>View and manage all tenant organisations. Filter by state, plan, status, or type to scan across your portfolio. Click a tenant to drill into full details, users, and operations.</p>
      </InfoPanel>

      {/* Stat Chips — click to filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <FilterChip label="Active" count={stats.active} active={filterStatus === "active"} onClick={() => setFilterStatus(filterStatus === "active" ? "" : "active")} color="green" />
        <FilterChip label="Trial" count={stats.trial} active={filterStatus === "trial"} onClick={() => setFilterStatus(filterStatus === "trial" ? "" : "trial")} color="blue" />
        <FilterChip label="Suspended" count={stats.suspended} active={filterStatus === "suspended"} onClick={() => setFilterStatus(filterStatus === "suspended" ? "" : "suspended")} color="amber" />
        <span className="w-px h-6 bg-gray-200" />
        <FilterChip label="Real" count={stats.real} active={filterTest === "false"} onClick={() => setFilterTest(filterTest === "false" ? "" : "false")} color="green" />
        <FilterChip label="Test" count={stats.test} active={filterTest === "true"} onClick={() => setFilterTest(filterTest === "true" ? "" : "true")} color="amber" />
        <span className="w-px h-6 bg-gray-200" />
        <div className="text-xs text-gray-500"><Users className="h-3 w-3 inline mr-1" />{stats.totalUsers} users</div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, slug, ABN, city..."
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-white border border-gray-300 rounded px-2 py-1.5 text-sm pr-7">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="provisioning">Provisioning</option>
          <option value="suspended">Suspended</option>
          <option value="pending">Pending</option>
        </select>
        <select value={filterTest} onChange={(e) => setFilterTest(e.target.value)} className="bg-white border border-gray-300 rounded px-2 py-1.5 text-sm pr-7">
          <option value="">Test & Real</option>
          <option value="false">Real only</option>
          <option value="true">Test only</option>
        </select>
        {states.length > 0 && (
          <select value={filterState} onChange={(e) => setFilterState(e.target.value)} className="bg-white border border-gray-300 rounded px-2 py-1.5 text-sm pr-7">
            <option value="">All states</option>
            {states.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        {plans.length > 0 && (
          <select value={filterPlan} onChange={(e) => setFilterPlan(e.target.value)} className="bg-white border border-gray-300 rounded px-2 py-1.5 text-sm pr-7">
            <option value="">All plans</option>
            {plans.map(p => <option key={p} value={p}>{planNameMap[p] || p}</option>)}
          </select>
        )}
        {(filterStatus || filterTest || filterState || filterPlan) && (
          <button
            type="button"
            onClick={() => { setFilterStatus(""); setFilterTest(""); setFilterState(""); setFilterPlan("") }}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Tenant list */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-gray-400 text-center py-12">
          {search || filterStatus || filterTest || filterState || filterPlan ? "No tenants match your filters" : "No tenants"}
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Tenant</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Location</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Plan</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Billing</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">Users</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Created</th>
                <th className="px-4 py-2.5 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, idx) => {
                const billing = billingStatus(t)
                return (
                  <tr
                    key={t.id}
                    onClick={() => navigate(`/platform/tenants/${t.id}`)}
                    className={cn(
                      "border-b border-gray-100 cursor-pointer hover:bg-primary-50/30 transition-colors",
                      idx % 2 === 1 && "bg-gray-50/50"
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-800 truncate">{t.display_name}</p>
                            {t.is_test && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-medium shrink-0">
                                <FlaskConical className="h-2.5 w-2.5" />Test
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 font-mono truncate">{t.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">
                        {[t.billing_city, t.billing_state].filter(Boolean).join(", ") || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {t.plan_name ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-700">
                          <CreditCard className="h-3 w-3 text-gray-400" />
                          {t.plan_name}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">No plan</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={t.status} semantic={statusSemantic(t.status)} className="text-xs" />
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs font-medium flex items-center gap-1", billing.color)}>
                        {billing.label === "Active" ? <CheckCircle className="h-3 w-3" /> :
                         billing.label.startsWith("No ") || billing.label === "Not billed" ? null :
                         billing.label.startsWith("Trial") ? null :
                         <AlertCircle className="h-3 w-3" />}
                        {billing.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <Users className="h-3 w-3" />{t.user_count}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <DateValue value={t.created_at} format="short" className="text-xs text-gray-500" />
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  )
}

const chipColors = {
  green: { active: "bg-green-100 text-green-800 border-green-300", inactive: "bg-white text-gray-600 border-gray-200 hover:border-gray-300" },
  blue: { active: "bg-blue-100 text-blue-800 border-blue-300", inactive: "bg-white text-gray-600 border-gray-200 hover:border-gray-300" },
  amber: { active: "bg-amber-100 text-amber-800 border-amber-300", inactive: "bg-white text-gray-600 border-gray-200 hover:border-gray-300" },
} as const

function FilterChip({ label, count, active, onClick, color }: {
  label: string; count: number; active: boolean; onClick: () => void; color: keyof typeof chipColors
}) {
  const c = chipColors[color]
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border transition-colors cursor-pointer",
        active ? c.active : c.inactive
      )}
    >
      {label}
      <span className={cn("tabular-nums", active ? "font-bold" : "text-gray-400")}>{count}</span>
    </button>
  )
}
