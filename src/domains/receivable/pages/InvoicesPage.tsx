import { useState, useMemo, useEffect } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { BackLink } from "@/components/primitives"
import { PageShell } from "@/components/layout"
import { Button, InfoPanel } from "@/components/primitives"
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

type DocFilter = "all" | "invoice" | "credit_note" | "overdue"

export function InvoicesPage() {
  usePageHelp(pageHelpContent.invoices)
  usePagePolicies(["receivable", "tax"])
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState("")

  // Derive initial filter from URL query param
  const urlFilter = searchParams.get("filter")
  const [docFilter, setDocFilter] = useState<DocFilter>(
    urlFilter === "overdue" ? "overdue" : "all"
  )

  // Sync docFilter changes back to URL
  useEffect(() => {
    if (docFilter === "overdue" && searchParams.get("filter") !== "overdue") {
      setSearchParams({ filter: "overdue" }, { replace: true })
    } else if (docFilter !== "overdue" && searchParams.has("filter")) {
      searchParams.delete("filter")
      setSearchParams(searchParams, { replace: true })
    }
  }, [docFilter, searchParams, setSearchParams])

  // When overdue is active, pass filter to API; otherwise fetch all
  const apiFilter = docFilter === "overdue" ? "overdue" : undefined
  const { data: invoices, isLoading, error } = useInvoices(apiFilter)

  const filtered = useMemo(() => {
    let list = invoices ?? []
    // "overdue" filtering is server-side; "invoice"/"credit_note" is client-side
    if (docFilter === "invoice") {
      list = list.filter(i => i.is_return !== true)
    } else if (docFilter === "credit_note") {
      list = list.filter(i => i.is_return === true)
    }
    if (!search) return list
    const q = search.toLowerCase()
    return list.filter(
      (i) =>
        i.invnumber?.toLowerCase().includes(q) ||
        i.customer_name?.toLowerCase().includes(q)
    )
  }, [invoices, search, docFilter])

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
        <div className="flex items-center gap-1 ml-4 bg-gray-100 rounded-lg p-0.5">
          {([["all", "All"], ["invoice", "Invoices"], ["credit_note", "Credit Notes"], ["overdue", "Overdue"]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setDocFilter(key)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${docFilter === key ? "bg-white shadow-sm text-gray-900 font-medium" : "text-gray-500 hover:text-gray-700"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="max-w-sm">
          <SearchFilter placeholder="Search invoices..." onSearch={setSearch} />
        </div>
      </div>
    </div>
  )

  return (
    <PageShell header={header} loading={isLoading}>
      <BackLink />
      {docFilter === "overdue" && (
        <div className="mb-4 rounded-lg border border-l-[3px] border-l-amber-400 border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700">
          Showing overdue invoices only —{" "}
          <Link
            to="/invoices"
            onClick={(e) => { e.preventDefault(); setDocFilter("all") }}
            className="underline font-medium hover:text-gray-900"
          >
            View all
          </Link>
        </div>
      )}
      <InfoPanel title="About Invoices" storageKey="invoices-info">
        <p>
          <strong>Invoices</strong> are bills you issue to customers — money they owe you. Each invoice records the
          goods or services, applicable GST, and a due date for payment.
        </p>
        <p className="mt-1.5">
          When a customer pays, go to the <Link to="/receipts" className="underline font-medium">Receipts</Link> page
          and allocate the receipt against the invoice(s) it settled. Issue a{" "}
          <Link to="/credit-notes" className="underline font-medium">Credit Note</Link> if you need to partially or
          fully refund an invoice.
        </p>
        <p className="mt-1.5 text-blue-600">
          Invoice lines with GST tax codes are automatically included in your BAS for the relevant period.
        </p>
      </InfoPanel>
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
