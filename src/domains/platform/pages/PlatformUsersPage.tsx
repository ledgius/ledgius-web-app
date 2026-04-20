// Spec references: R-0068 (PA-020 through PA-027).
import { useQuery } from "@tanstack/react-query"
import { PageShell } from "@/components/layout"
import { InfoPanel, Skeleton } from "@/components/primitives"
import { usePageHelp } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { api } from "@/shared/lib/api"
import { Shield, Mail } from "lucide-react"
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

export function PlatformUsersPage() {
  usePageHelp(undefined)
  usePagePolicies(["platform"])

  const { data: users, isLoading } = useQuery({
    queryKey: ["platform", "users"],
    queryFn: () => api.get<PlatformUser[]>("/platform/users"),
  })

  const admins = (users ?? []).filter(u => u.is_platform_admin)
  const regular = (users ?? []).filter(u => !u.is_platform_admin)

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Users</h1>
        <span className="text-sm text-gray-400">{(users ?? []).length} users</span>
      </div>
      <p className="text-sm text-gray-500">Manage platform and tenant users</p>
    </div>
  )

  return (
    <PageShell header={header}>
      <InfoPanel title="User management" storageKey="platform-users-info" collapsible>
        <p>View and manage platform administrators and tenant users across all organisations. Platform admins can access the Platform sidebar and manage all tenants.</p>
      </InfoPanel>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" />
        </div>
      ) : (users ?? []).length === 0 ? (
        <div className="text-sm text-gray-400 text-center py-12">No users found</div>
      ) : (
        <div className="space-y-6">
          {admins.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />Platform Administrators ({admins.length})
              </h2>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">Name</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">Email</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">Auth</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">Status</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {admins.map((u, i) => <UserRow key={u.id} user={u} zebra={i % 2 === 1} />)}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {regular.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />Users ({regular.length})
              </h2>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">Name</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">Email</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">Auth</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">Status</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {regular.map((u, i) => <UserRow key={u.id} user={u} zebra={i % 2 === 1} />)}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </PageShell>
  )
}

function UserRow({ user: u, zebra }: { user: PlatformUser; zebra: boolean }) {
  return (
    <tr className={zebra ? "bg-gray-50/50" : ""}>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{u.display_name}</span>
          {u.is_platform_admin && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold">Admin</span>
          )}
        </div>
      </td>
      <td className="px-4 py-2.5 text-gray-600 font-mono text-xs">{u.email}</td>
      <td className="px-4 py-2.5">
        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{u.auth_provider}</span>
      </td>
      <td className="px-4 py-2.5">
        <span className={cn(
          "text-xs px-2 py-0.5 rounded-full font-medium",
          u.status === "active" ? "bg-green-50 text-green-700" :
          u.status === "suspended" ? "bg-amber-50 text-amber-700" :
          "bg-gray-100 text-gray-500"
        )}>{u.status}</span>
      </td>
      <td className="px-4 py-2.5 text-gray-500 text-xs">
        {new Date(u.created_at).toLocaleDateString("en-AU")}
      </td>
    </tr>
  )
}
