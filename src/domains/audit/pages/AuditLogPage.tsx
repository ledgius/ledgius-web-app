import { useState } from "react"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell } from "@/components/layout"
import { DataTable } from "@/shared/components/DataTable"
import { useAuditLog, type AuditEntry } from "../hooks/useAuditLog"
import { formatDate } from "@/shared/lib/utils"

const columns = [
  { key: "created_at", header: "Date", render: (r: AuditEntry) => formatDate(r.created_at) },
  { key: "action", header: "Action" },
  { key: "entity_type", header: "Entity", className: "w-24" },
  { key: "entity_id", header: "ID", className: "w-16 font-mono", render: (r: AuditEntry) => r.entity_id ?? "-" },
  { key: "user_id", header: "User", render: (r: AuditEntry) => r.user_id ?? "system" },
]

export function AuditLogPage() {
  usePageHelp(pageHelpContent.auditLog)
  usePagePolicies(["platform"])
  const [entityType, setEntityType] = useState("")
  const { data: entries, isLoading, error } = useAuditLog(entityType || undefined)

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Audit Log</h1>
        <span className="text-sm text-gray-500">{entries?.length ?? 0} entries</span>
      </div>
      <div className="flex items-center gap-3 mt-3">
        <select value={entityType} onChange={e => setEntityType(e.target.value)} className="border rounded px-2 py-1.5 text-sm">
          <option value="">All entities</option>
          <option value="account">Accounts</option>
          <option value="invoice">Invoices</option>
          <option value="bill">Bills</option>
          <option value="contact">Contacts</option>
          <option value="product">Products</option>
          <option value="transaction">Transactions</option>
        </select>
      </div>
    </div>
  )

  return (
    <PageShell header={header}>
      <DataTable columns={columns} data={entries ?? []} loading={isLoading} error={error} emptyMessage="No audit entries." />
    </PageShell>
  )
}
