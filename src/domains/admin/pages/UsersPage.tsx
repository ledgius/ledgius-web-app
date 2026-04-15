import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell } from "@/components/layout"
import { InfoPanel } from "@/components/primitives"

export function UsersPage() {
  usePageHelp(pageHelpContent.users)
  usePagePolicies(["platform"])
  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">User Management</h1>
      </div>
      <p className="text-sm text-gray-500 mt-0.5">Control who can access this organisation</p>
    </div>
  )

  return (
    <PageShell header={header}>
      <InfoPanel title="About User Management" storageKey="users-info">
        <p>
          <strong>User Management</strong> controls who can sign in to this organisation and what they can do. Users
          live in the platform database (<code className="font-mono">ledgius_platform</code>) and are assigned one
          role per organisation they access.
        </p>
        <p className="mt-1.5">
          <strong>Available roles</strong>:
          {" "}<code className="font-mono">owner</code>,
          {" "}<code className="font-mono">master_accountant</code>,
          {" "}<code className="font-mono">accountant</code>,
          {" "}<code className="font-mono">bookkeeper</code>,
          {" "}<code className="font-mono">viewer</code>. Role assignment is currently managed via the platform API —
          the admin UI for CRUD operations is on the roadmap.
        </p>
        <p className="mt-1.5 text-blue-600">
          This page requires multi-tenant mode (<code className="font-mono">SINGLE_TENANT_MODE=false</code>). In
          single-tenant mode the page is read-only and most controls are hidden.
        </p>
      </InfoPanel>
      <div className="text-center py-12 text-gray-400 text-sm">
        User list UI not yet built. Manage users via the platform API:
        <div className="mt-3 space-y-1 font-mono text-xs text-gray-500">
          <div><code>GET /auth/me</code> — current user and tenants</div>
          <div><code>POST /auth/switch-tenant</code> — switch organisation</div>
        </div>
      </div>
    </PageShell>
  )
}
