// Spec references: R-0068 (PA-020 through PA-027).
import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { PageShell } from "@/components/layout"
import { InfoPanel, Skeleton } from "@/components/primitives"
import { usePageHelp } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { api } from "@/shared/lib/api"
import { Search, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface PlatformUser {
  id: string
  email: string
  display_name: string
  is_platform_admin: boolean
  status: string
  auth_provider: string
  created_at: string
  updated_at: string
}

type SortField = "display_name" | "email" | "status" | "created_at" | "updated_at"
type SortDir = "asc" | "desc"

function roleLabel(u: PlatformUser): string {
  if (u.is_platform_admin) return "platform"
  return "staff"
}

export function PlatformUsersPage() {
  usePageHelp(undefined)
  usePagePolicies(["platform"])

  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [filterRole, setFilterRole] = useState("")
  const [sortField, setSortField] = useState<SortField>("display_name")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  const { data: users, isLoading } = useQuery({
    queryKey: ["platform", "users"],
    queryFn: () => api.get<PlatformUser[]>("/platform/users"),
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

    return list
  }, [all, search, filterStatus, filterRole])

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

  // Unique statuses for filter dropdown
  const statuses = [...new Set(all.map(u => u.status))].sort()

  const header = (
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
  )

  return (
    <PageShell header={header}>
      <InfoPanel title="User management" storageKey="platform-users-info" collapsible>
        <p>View and manage platform administrators and tenant users across all organisations. Platform admins can access the Platform sidebar and manage all tenants.</p>
      </InfoPanel>

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
        {(search || filterStatus || filterRole) && (
          <button
            type="button"
            onClick={() => { setSearch(""); setFilterStatus(""); setFilterRole("") }}
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
                <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs uppercase tracking-wide">Auth</th>
                <SortHeader label="Status" field="status" current={sortField} dir={sortDir} onSort={toggleSort} />
                <SortHeader label="Created" field="created_at" current={sortField} dir={sortDir} onSort={toggleSort} />
                <SortHeader label="Updated" field="updated_at" current={sortField} dir={sortDir} onSort={toggleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((u, i) => (
                <tr key={u.id} className={i % 2 === 1 ? "bg-gray-50/50" : ""}>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
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
          <ChevronsUpDown className="h-3 w-3 text-gray-300 group-hover:text-primary-400" />
        )}
      </span>
    </th>
  )
}
