import { PageShell } from "@/components/layout"
import { InfoPanel } from "@/components/primitives"
import { usePageHelp } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"

export function TenantsPage() {
  usePageHelp(undefined)
  usePagePolicies(["platform"])

  const header = (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Tenants</h1>
      <p className="text-sm text-gray-500">Manage tenant organisations</p>
    </div>
  )

  return (
    <PageShell header={header}>
      <InfoPanel title="Tenant management" storageKey="platform-tenants-info" collapsible>
        <p>View and manage all tenant organisations, their subscriptions, and provisioning status.</p>
      </InfoPanel>
      <div className="text-sm text-gray-400 text-center py-12">No tenants</div>
    </PageShell>
  )
}
