// Spec references: R-0068 (PA-020 through PA-027).
import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { PageShell } from "@/components/layout"
import { Button, InfoPanel, Skeleton } from "@/components/primitives"
import { useFeedback } from "@/components/feedback"
import { usePageHelp } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { api } from "@/shared/lib/api"
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, Plus, X, Check } from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface UserTenantInfo {
  tenant_id: string
  tenant_name: string
  tenant_slug: string
  role: string
}

interface PlatformUser {
  id: string
  email: string
  display_name: string
  is_platform_admin: boolean
  status: string
  auth_provider: string
  created_at: string
  updated_at: string
  tenants: UserTenantInfo[]
}

type SortField = "display_name" | "email" | "status" | "created_at" | "updated_at"
type SortDir = "asc" | "desc"

export function PlatformUsersPage() {
  usePageHelp(undefined)
  usePagePolicies(["platform"])

  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [filterRole, setFilterRole] = useState("")
  const [filterTenant, setFilterTenant] = useState("")
  const [sortField, setSortField] = useState<SortField>("display_name")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  const feedback = useFeedback()
  const qc = useQueryClient()
  const [showCreateForm, setShowCreateForm] = useState(false)

  const { data: users, isLoading } = useQuery({
    queryKey: ["platform", "users"],
    queryFn: () => api.get<PlatformUser[]>("/platform/users"),
  })

  const createUser = useMutation({
    mutationFn: (body: { email: string; display_name: string; is_platform_admin: boolean }) =>
      api.post("/platform/users", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["platform", "users"] }); feedback.success("User created"); setShowCreateForm(false) },
    onError: (err: Error) => feedback.error("Create failed", err.message),
  })

  const updateUser = useMutation({
    mutationFn: ({ id, ...body }: { id: string; display_name?: string; is_platform_admin?: boolean; status?: string }) =>
      api.put(`/platform/users/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["platform", "users"] }); feedback.success("User updated") },
    onError: (err: Error) => feedback.error("Update failed", err.message),
  })

  const deactivateUser = useMutation({
    mutationFn: (id: string) => api.post(`/platform/users/${id}/deactivate`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["platform", "users"] }); feedback.success("User deactivated") },
    onError: (err: Error) => feedback.error("Deactivate failed", err.message),
  })

  const all = users ?? []

  // Filter
  const filtered = useMemo(() => {
    let list = all

    if (search) {
      const s = search.toLowerCase()
      list = list.filter(u =>
        u.display_name.toLowerCase().includes(s) ||
        u.email.toLowerCase().includes(s)
      )
    }

    if (filterStatus) {
      list = list.filter(u => u.status === filterStatus)
    }

    if (filterRole) {
      if (filterRole === "platform") list = list.filter(u => u.is_platform_admin)
      else if (filterRole === "staff") list = list.filter(u => !u.is_platform_admin)
    }

    if (filterTenant) {
      list = list.filter(u => u.tenants?.some(t => t.tenant_slug === filterTenant))
    }

    return list
  }, [all, search, filterStatus, filterRole, filterTenant])

  // Sort
  const sorted = useMemo(() => {
    const list = [...filtered]
    list.sort((a, b) => {
      let av: string, bv: string
      switch (sortField) {
        case "display_name": av = a.display_name; bv = b.display_name; break
        case "email": av = a.email; bv = b.email; break
        case "status": av = a.status; bv = b.status; break
        case "created_at": av = a.created_at; bv = b.created_at; break
        case "updated_at": av = a.updated_at; bv = b.updated_at; break
        default: av = ""; bv = ""
      }
      const cmp = av.localeCompare(bv)
      return sortDir === "asc" ? cmp : -cmp
    })
    return list
  }, [filtered, sortField, sortDir])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDir("asc")
    }
  }

  // Stats
  const stats = {
    total: all.length,
    active: all.filter(u => u.status === "active").length,
    invited: all.filter(u => u.status === "invited").length,
    suspended: all.filter(u => u.status === "suspended").length,
    platform: all.filter(u => u.is_platform_admin).length,
  }

  // Unique statuses and tenants for filter dropdowns
  const statuses = [...new Set(all.map(u => u.status))].sort()
  const tenantMap = new Map<string, string>()
  for (const u of all) {
    for (const t of u.tenants ?? []) {
      tenantMap.set(t.tenant_slug, t.tenant_name)
    }
  }
  const tenantOptions = [...tenantMap.entries()].sort((a, b) => a[1].localeCompare(b[1]))

  const header = (
    <div className="flex items-center justify-between">
      <div>
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-semibold text-gray-900">Users</h1>
          <span className="text-sm text-gray-400">
            {stats.total} total · {stats.active} active · {stats.platform} admin{stats.platform !== 1 ? "s" : ""}
            {stats.invited > 0 && ` · ${stats.invited} invited`}
            {stats.suspended > 0 && ` · ${stats.suspended} suspended`}
          </span>
        </div>
        <p className="text-sm text-gray-500">Manage platform and tenant users</p>
      </div>
      <Button variant="primary" size="sm" onClick={() => setShowCreateForm(true)}>
        <Plus className="h-3.5 w-3.5" />Add User
      </Button>
    </div>
  )

  return (
    <PageShell header={header}>
      <InfoPanel title="User management" storageKey="platform-users-info" collapsible>
        <p>View and manage platform administrators and tenant users across all organisations. Platform admins can access the Platform sidebar and manage all tenants.</p>
      </InfoPanel>

      {/* Create User Form */}
      {showCreateForm && <CreateUserForm onCancel={() => setShowCreateForm(false)} onCreate={(u) => createUser.mutate(u)} saving={createUser.isPending} />}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name or email..."
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="bg-white border border-gray-300 rounded px-2 py-1.5 text-sm pr-7"
        >
          <option value="">All statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          className="bg-white border border-gray-300 rounded px-2 py-1.5 text-sm pr-7"
        >
          <option value="">All roles</option>
          <option value="platform">Platform Admin</option>
          <option value="staff">Staff</option>
        </select>
        {tenantOptions.length > 0 && (
          <select
            value={filterTenant}
            onChange={e => setFilterTenant(e.target.value)}
            className="bg-white border border-gray-300 rounded px-2 py-1.5 text-sm pr-7"
          >
            <option value="">All tenants</option>
            {tenantOptions.map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}
          </select>
        )}
        {(search || filterStatus || filterRole || filterTenant) && (
          <button
            type="button"
            onClick={() => { setSearch(""); setFilterStatus(""); setFilterRole(""); setFilterTenant("") }}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-sm text-gray-400 text-center py-12">
          {search || filterStatus || filterRole ? "No users match your filters" : "No users found"}
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <SortHeader label="Name" field="display_name" current={sortField} dir={sortDir} onSort={toggleSort} />
                <SortHeader label="Email" field="email" current={sortField} dir={sortDir} onSort={toggleSort} />
                <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Role</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Tenants</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Auth</th>
                <SortHeader label="Status" field="status" current={sortField} dir={sortDir} onSort={toggleSort} />
                <SortHeader label="Created" field="created_at" current={sortField} dir={sortDir} onSort={toggleSort} />
                <SortHeader label="Updated" field="updated_at" current={sortField} dir={sortDir} onSort={toggleSort} />
                <th className="px-4 py-2.5 w-28"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((u, i) => (
                <tr key={u.id} className={`group ${i % 2 === 1 ? "bg-gray-50/50" : ""}`}>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{u.display_name}</td>
                  <td className="px-4 py-2.5 text-gray-600 font-mono text-xs">{u.email}</td>
                  <td className="px-4 py-2.5">
                    {u.is_platform_admin ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold">Platform Admin</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">Staff</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {(u.tenants ?? []).length === 0 ? (
                      <span className="text-xs text-gray-400">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {u.tenants.map(t => (
                          <span key={t.tenant_slug} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600" title={`${t.tenant_name} (${t.role})`}>
                            {t.tenant_name}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{u.auth_provider}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium",
                      u.status === "active" ? "bg-green-50 text-green-700" :
                      u.status === "invited" ? "bg-blue-50 text-blue-700" :
                      u.status === "suspended" ? "bg-amber-50 text-amber-700" :
                      u.status === "deactivated" ? "bg-red-50 text-red-700" :
                      "bg-gray-100 text-gray-500"
                    )}>{u.status}</span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs tabular-nums">
                    {new Date(u.created_at).toLocaleDateString("en-AU")}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs tabular-nums">
                    {new Date(u.updated_at).toLocaleDateString("en-AU")}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); updateUser.mutate({ id: u.id, is_platform_admin: !u.is_platform_admin }) }}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                        title={u.is_platform_admin ? "Remove admin" : "Make admin"}
                      >
                        {u.is_platform_admin ? "Remove Admin" : "Make Admin"}
                      </button>
                      {u.status === "active" && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); deactivateUser.mutate(u.id) }}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Deactivate user"
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
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

function CreateUserForm({ onCancel, onCreate, saving }: {
  onCancel: () => void; onCreate: (u: { email: string; display_name: string; is_platform_admin: boolean }) => void; saving: boolean
}) {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)

  return (
    <div className="border border-primary-200 rounded-lg bg-primary-50/30 p-4 mb-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">Create User</p>
        <button type="button" onClick={onCancel} className="p-1 text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com" className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm" /></div>
        <div><label className="block text-xs font-medium text-gray-600 mb-1">Display Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm" /></div>
      </div>
      <label className="flex items-center gap-2 text-xs text-gray-600">
        <input type="checkbox" checked={isAdmin} onChange={e => setIsAdmin(e.target.checked)} className="rounded border-gray-300 text-primary-600" />
        Platform administrator
      </label>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={() => onCreate({ email, display_name: name, is_platform_admin: isAdmin })} loading={saving} disabled={!email || !name}>
          <Check className="h-3.5 w-3.5" />Create User
        </Button>
      </div>
    </div>
  )
}

function SortHeader({ label, field, current, dir, onSort }: {
  label: string; field: SortField; current: SortField; dir: SortDir
  onSort: (field: SortField) => void
}) {
  const active = current === field
  return (
    <th
      className="text-left px-4 py-2.5 font-medium text-xs uppercase tracking-wide cursor-pointer select-none group transition-colors hover:text-primary-600"
      onClick={() => onSort(field)}
      title={`Sort by ${label}`}
    >
      <span className={cn("flex items-center gap-1", active ? "text-primary-600" : "text-gray-600")}>
        {label}
        {active ? (
          dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronsUpDown className="h-3 w-3 text-gray-400 group-hover:text-primary-500" />
        )}
      </span>
    </th>
  )
}
