import { PageShell } from "@/components/layout"
import { InfoPanel } from "@/components/primitives"
import { usePageHelp } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"

export function PricingPlansPage() {
  usePageHelp(undefined)
  usePagePolicies(["platform"])

  const header = (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Pricing Plans</h1>
      <p className="text-sm text-gray-500">Configure plans, features, and pricing</p>
    </div>
  )

  return (
    <PageShell header={header}>
      <InfoPanel title="Plan configuration" storageKey="platform-plans-info" collapsible>
        <p>Define pricing plans, included features, and billing tiers for tenant subscriptions.</p>
      </InfoPanel>
      <div className="text-sm text-gray-400 text-center py-12">No pricing plans configured</div>
    </PageShell>
  )
}
