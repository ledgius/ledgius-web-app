import { PageShell } from "@/components/layout"
import { InfoPanel } from "@/components/primitives"
import { usePageHelp } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"

export function PlatformUsersPage() {
  usePageHelp(undefined)
  usePagePolicies(["platform"])

  const header = (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Users</h1>
      <p className="text-sm text-gray-500">Manage platform and tenant users</p>
    </div>
  )

  return (
    <PageShell header={header}>
      <InfoPanel title="User management" storageKey="platform-users-info" collapsible>
        <p>View and manage platform administrators and tenant users across all organisations.</p>
      </InfoPanel>
      <div className="text-sm text-gray-400 text-center py-12">No users</div>
    </PageShell>
  )
}
