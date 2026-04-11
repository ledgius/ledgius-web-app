import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell } from "@/components/layout"
import { DataTable } from "@/shared/components/DataTable"
import { useTemplates, useDeleteTemplate, type TransactionTemplate } from "../hooks/useTemplates"

export function TemplatesPage() {
  usePageHelp(pageHelpContent.templates)
  usePagePolicies(["journal"])
  const { data: templates, isLoading } = useTemplates()
  const deleteTemplate = useDeleteTemplate()

  const columns = [
    { key: "name", header: "Name" },
    { key: "source_type", header: "Type", className: "w-16 uppercase" },
    { key: "description", header: "Description", render: (r: TransactionTemplate) => r.description ?? "-" },
    { key: "actions", header: "", className: "w-20",
      render: (r: TransactionTemplate) => (
        <button onClick={() => deleteTemplate.mutate(r.id)}
          className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100">Delete</button>
      ),
    },
  ]

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Transaction Templates</h1>
        <span className="text-sm text-gray-500">{templates?.length ?? 0} templates</span>
      </div>
    </div>
  )

  return (
    <PageShell header={header}>
      {isLoading ? <p className="text-gray-500">Loading...</p> : <DataTable columns={columns} data={templates ?? []} emptyMessage="No saved templates." />}
    </PageShell>
  )
}
