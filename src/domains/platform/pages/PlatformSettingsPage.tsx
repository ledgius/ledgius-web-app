import { PageShell } from "@/components/layout"
import { InfoPanel } from "@/components/primitives"
import { usePageHelp } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"

export function PlatformSettingsPage() {
  usePageHelp(undefined)
  usePagePolicies(["platform"])

  const header = (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Platform Settings</h1>
      <p className="text-sm text-gray-500">System-wide configuration</p>
    </div>
  )

  return (
    <PageShell header={header}>
      <InfoPanel title="Platform configuration" storageKey="platform-settings-info" collapsible>
        <p>Configure system-wide settings including default regions, feature flags, and integration credentials.</p>
      </InfoPanel>
      <div className="text-sm text-gray-400 text-center py-12">No settings configured</div>
    </PageShell>
  )
}
