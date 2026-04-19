import { PageShell } from "@/components/layout"
import { InfoPanel } from "@/components/primitives"
import { usePageHelp } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"

export function SignupQueuePage() {
  usePageHelp(undefined)
  usePagePolicies(["platform"])

  const header = (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Sign-up Queue</h1>
      <p className="text-sm text-gray-500">Review and approve new business sign-ups</p>
    </div>
  )

  return (
    <PageShell header={header}>
      <InfoPanel title="Sign-up review" storageKey="platform-signups-info" collapsible>
        <p>New sign-ups appear here for review. Accept to start tenant provisioning, or reject with a reason.</p>
      </InfoPanel>
      <div className="text-sm text-gray-400 text-center py-12">No pending sign-ups</div>
    </PageShell>
  )
}
