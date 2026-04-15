// Spec references: R-0054, A-0030 §"Reporting UI", T-0028 §"Phase 5".
//
// Platform-owner admin home — currently hosts the LSMB migration status
// tile. Future tiles (pricing-plans admin from R-0053, etc.) land here.

import { PageShell } from "@/components/layout"
import { LsmbMigrationTile } from "../components/LsmbMigrationTile"

export function PlatformAdminPage() {
  const header = (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Platform Administration</h1>
      <p className="mt-0.5 text-sm text-gray-500">
        Operational visibility for platform owners.
      </p>
    </div>
  )

  return (
    <PageShell header={header}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-6xl">
        <LsmbMigrationTile />
      </div>
    </PageShell>
  )
}
