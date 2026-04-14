import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { PageShell } from "@/components/layout"
import { Button } from "@/components/primitives"
import { DataTable, type Column } from "@/shared/components/DataTable"
import { SearchFilter } from "@/shared/components/SearchFilter"
import { StatusPill, MoneyValue, DateValue } from "@/components/financial"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { useInvoices, type InvoiceSummary } from "../hooks/useInvoices"
import { Plus } from "lucide-react"

const columns: Column<InvoiceSummary>[] = [
  { key: "invnumber", header: "Invoice #", className: "font-mono", render: (row: InvoiceSummary) => <span className="text-primary-600 hover:underline cursor-pointer">{row.invnumber}</span> },
  { key: "customer_name", header: "Customer" },
  {
    key: "transdate",
    header: "Date",
    render: (row: InvoiceSummary) => row.transdate ? <DateValue value={row.transdate} format="short" /> : <span className="text-gray-400">—</span>,
  },
  {
    key: "duedate",
    header: "Due",
    render: (row: InvoiceSummary) => row.duedate ? <DateValue value={row.duedate} format="short" /> : <span className="text-gray-400">—</span>,
  },
  {
    key: "amount_bc",
    header: "Amount",
    className: "text-right",
    render: (row: InvoiceSummary) => <MoneyValue amount={row.amount_bc} currency={row.curr} />,
  },
  {
    key: "approved",
    header: "Status",
    className: "w-28",
    render: (row: InvoiceSummary) => (
      <StatusPill status={row.on_hold ? "on_hold" : row.approved ? "posted" : "draft"} />
    ),
  },
]

export function InvoicesPage() {
  usePageHelp(pageHelpContent.invoices)
  usePagePolicies(["receivable", "tax"])
  const { data: invoices, isLoading, error } = useInvoices()
  const navigate = useNavigate()
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    if (!search || !invoices) return invoices ?? []
    const q = search.toLowerCase()
    return invoices.filter(
      (i) =>
        i.invnumber?.toLowerCase().includes(q) ||
        i.customer_name?.toLowerCase().includes(q)
    )
  }, [invoices, search])

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Invoices</h1>
        <span className="text-sm text-gray-500">Accounts Receivable &middot; {filtered.length} records</span>
      </div>
      <p className="text-sm text-gray-500 mt-0.5">Money your customers owe you</p>
      <div className="flex items-center gap-3 mt-3">
        <Button onClick={() => navigate("/invoices/new")}>
          <Plus className="h-4 w-4" />
          New Invoice
        </Button>
        <div className="flex-1" />
        <div className="max-w-sm">
          <SearchFilter placeholder="Search invoices..." onSearch={setSearch} />
        </div>
      </div>
    </div>
  )

  return (
    <PageShell header={header} loading={isLoading}>
      <DataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        error={error}
        emptyMessage="No invoices in this period. Create a new invoice or adjust your filters."
        onRowClick={(row) => navigate(`/invoices/${row.trans_id}`)}
      />
    </PageShell>
  )
}
