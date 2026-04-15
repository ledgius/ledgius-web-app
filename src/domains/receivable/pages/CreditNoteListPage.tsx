import { Link, useNavigate } from "react-router-dom"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell } from "@/components/layout"
import { Button, InfoPanel } from "@/components/primitives"
import { StatusPill, MoneyValue, DateValue } from "@/components/financial"
import { DataTable, type Column } from "@/shared/components/DataTable"
import { useInvoices, type InvoiceSummary } from "../hooks/useInvoices"
import { Plus } from "lucide-react"

const columns: Column<InvoiceSummary>[] = [
  {
    key: "invnumber",
    header: "Credit Note #",
    className: "font-mono w-36 whitespace-nowrap",
    render: (row: InvoiceSummary) => <span className="text-primary-600 hover:underline cursor-pointer">{row.invnumber}</span>,
  },
  { key: "customer_name", header: "Customer" },
  {
    key: "transdate",
    header: "Date",
    render: (row: InvoiceSummary) => row.transdate ? <DateValue value={row.transdate} format="short" /> : <span className="text-gray-400">—</span>,
  },
  {
    key: "amount_bc",
    header: "Amount",
    className: "text-right",
    render: (row: InvoiceSummary) => <MoneyValue amount={Math.abs(parseFloat(row.amount_bc))} currency={row.curr} />,
  },
  {
    key: "approved",
    header: "Status",
    className: "w-28",
    render: (row: InvoiceSummary) => (
      <StatusPill status={row.approved ? "posted" : "draft"} />
    ),
  },
]

export function CreditNoteListPage() {
  usePageHelp(pageHelpContent.creditNotes)
  usePagePolicies(["receivable", "tax"])
  const { data: invoices, isLoading, error } = useInvoices()
  const navigate = useNavigate()

  // Filter to credit notes only (is_return would be ideal but we don't have it in the summary —
  // credit notes have negative amounts in the AR list)
  const creditNotes = (invoices ?? []).filter((i) => parseFloat(i.amount_bc) < 0)

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Credit Notes</h1>
        <span className="text-sm text-gray-500">{creditNotes.length} credit notes</span>
      </div>
      <p className="text-sm text-gray-500 mt-0.5">Adjustments reducing what customers owe</p>
      <div className="flex items-center gap-3 mt-3">
        <Button onClick={() => navigate("/credit-notes/new")}>
          <Plus className="h-4 w-4" />
          New Credit Note
        </Button>
      </div>
    </div>
  )

  return (
    <PageShell header={header} loading={isLoading}>
      <InfoPanel title="About Credit Notes" storageKey="credit-notes-list-info">
        <p>
          <strong>Credit Notes</strong> reduce what a customer owes you — issued for returns, partial refunds, or price
          adjustments against a previously issued <Link to="/invoices" className="underline font-medium">invoice</Link>.
          Each credit note records the original invoice, the credit amount, and the reason.
        </p>
        <p className="mt-1.5">
          Click <strong>New Credit Note</strong> to issue one. GST on the original invoice is proportionally reversed —
          this affects the BAS period in which the credit note is dated, not the original invoice's period.
        </p>
        <p className="mt-1.5 text-blue-600">
          Never delete an invoice to "fix" it — always issue a credit note. Deletion breaks the audit trail.
        </p>
      </InfoPanel>
      <DataTable
        columns={columns}
        data={creditNotes}
        loading={isLoading}
        error={error}
        emptyMessage="No credit notes issued. Click '+ New Credit Note' to issue one against an existing invoice."
        onRowClick={(row) => navigate(`/invoices/${row.trans_id}`)}
      />
    </PageShell>
  )
}
