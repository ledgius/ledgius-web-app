import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell, PageSection } from "@/components/layout"

export function UsersPage() {
  usePageHelp(pageHelpContent.users)
  usePagePolicies(["platform"])
  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">User Management</h1>
      </div>
    </div>
  )

  return (
    <PageShell header={header}>
      <PageSection title="Configuration">
        <p className="text-sm text-gray-500 mb-3">
          User management requires multi-tenant mode (<code className="text-xs bg-gray-100 px-1 rounded">SINGLE_TENANT_MODE=false</code>).
          Users are stored in the platform database (<code className="text-xs bg-gray-100 px-1 rounded">ledgius_platform</code>).
        </p>
        <p className="text-sm text-gray-500">
          Available roles: <strong>owner</strong>, <strong>master_accountant</strong>, <strong>accountant</strong>, <strong>bookkeeper</strong>, <strong>viewer</strong>.
          Role assignment is managed via the platform API:
        </p>
        <ul className="text-sm text-gray-500 mt-2 space-y-1 list-disc list-inside">
          <li><code className="text-xs bg-gray-100 px-1 rounded">GET /auth/me</code> — current user and tenants</li>
          <li><code className="text-xs bg-gray-100 px-1 rounded">POST /auth/switch-tenant</code> — switch organisation</li>
          <li>Full user CRUD will be added as an admin API</li>
        </ul>
      </PageSection>
    </PageShell>
  )
}
