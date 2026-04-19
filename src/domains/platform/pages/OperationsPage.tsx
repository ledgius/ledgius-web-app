import { PageShell } from "@/components/layout"
import { InfoPanel } from "@/components/primitives"
import { usePageHelp } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"

export function OperationsPage() {
  usePageHelp(undefined)
  usePagePolicies(["platform"])

  const header = (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Operations</h1>
      <p className="text-sm text-gray-500">Monitor provisioning, backups, and system jobs</p>
    </div>
  )

  return (
    <PageShell header={header}>
      <InfoPanel title="Operations dashboard" storageKey="platform-operations-info" collapsible>
        <p>Monitor tenant provisioning, scheduled backups, background jobs, and system health.</p>
      </InfoPanel>
      <div className="text-sm text-gray-400 text-center py-12">No active operations</div>
    </PageShell>
  )
}
