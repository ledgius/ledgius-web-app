import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell } from "@/components/layout"
import { DataTable } from "@/shared/components/DataTable"
import { useTaxCodes, type TaxCode } from "../hooks/useTaxCodes"

const columns = [
  { key: "code", header: "Code", className: "font-mono w-20" },
  { key: "name", header: "Name" },
  { key: "description", header: "Description" },
  { key: "rate", header: "Rate", className: "text-right font-mono w-20",
    render: (row: TaxCode) => `${(parseFloat(row.rate) * 100).toFixed(0)}%` },
  { key: "tax_type", header: "Type", className: "w-16 uppercase" },
  { key: "jurisdiction", header: "Jurisdiction", className: "w-16" },
  { key: "active", header: "Active", className: "w-16 text-center",
    render: (row: TaxCode) => row.active
      ? <span className="text-green-600 text-xs">Yes</span>
      : <span className="text-gray-400 text-xs">No</span>,
  },
]

export function TaxCodesPage() {
  usePageHelp(pageHelpContent.taxCodes)
  usePagePolicies(["tax"])
  const { data: codes, isLoading, error } = useTaxCodes()

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Tax Codes</h1>
        <span className="text-sm text-gray-500">{codes?.length ?? 0} codes</span>
      </div>
      <p className="text-sm text-gray-500 mt-0.5">How GST is calculated on transactions</p>
    </div>
  )

  return (
    <PageShell header={header} loading={isLoading}>
      <DataTable columns={columns} data={codes ?? []} loading={isLoading} error={error} emptyMessage="No tax codes configured." />
    </PageShell>
  )
}
