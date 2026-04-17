import { useState, useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell } from "@/components/layout"
import { Button, InfoPanel } from "@/components/primitives"
import { DataTable, type Column } from "@/shared/components/DataTable"
import { StatusPill, MoneyValue, DateValue } from "@/components/financial"
import { useBills, type BillSummary } from "../hooks/useBills"
import { Plus } from "lucide-react"

const columns: Column<BillSummary>[] = [
  { key: "invnumber", header: "Bill #", className: "font-mono", render: (row: BillSummary) => <span className="text-primary-600 hover:underline cursor-pointer">{row.invnumber}</span> },
  { key: "vendor_name", header: "Vendor" },
  {
    key: "transdate",
    header: "Date",
    render: (row: BillSummary) => row.transdate ? <DateValue value={row.transdate} format="short" /> : <span className="text-gray-400">—</span>,
  },
  {
    key: "duedate",
    header: "Due",
    render: (row: BillSummary) => row.duedate ? <DateValue value={row.duedate} format="short" /> : <span className="text-gray-400">—</span>,
  },
  {
    key: "amount_bc",
    header: "Amount",
    className: "text-right",
    render: (row: BillSummary) => <MoneyValue amount={row.amount_bc} currency={row.curr} />,
  },
  {
    key: "approved",
    header: "Status",
    className: "w-28",
    render: (row: BillSummary) => (
      <StatusPill status={row.on_hold ? "on_hold" : row.approved ? "posted" : "draft"} />
    ),
  },
]

type DocFilter = "all" | "invoice" | "credit_note"

export function BillsPage() {
  usePageHelp(pageHelpContent.bills)
  usePagePolicies(["payable", "tax"])
  const { data: bills, isLoading, error } = useBills()
  const navigate = useNavigate()
  const [docFilter, setDocFilter] = useState<DocFilter>("all")

  const filtered = useMemo(() => {
    if (docFilter === "all" || !bills) return bills ?? []
    return bills.filter(b => {
      if (docFilter === "credit_note") return (b as Record<string, unknown>).is_return === true
      return (b as Record<string, unknown>).is_return !== true
    })
  }, [bills, docFilter])

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Bills</h1>
        <span className="text-sm text-gray-500">Accounts Payable &middot; {filtered.length} records</span>
      </div>
      <p className="text-sm text-gray-500 mt-0.5">Money you owe your suppliers</p>
      <div className="flex items-center gap-3 mt-3">
        <Button onClick={() => navigate("/bills/new")}>
          <Plus className="h-4 w-4" />
          New Bill
        </Button>
        <div className="flex items-center gap-1 ml-4 bg-gray-100 rounded-lg p-0.5">
          {([["all", "All"], ["invoice", "Bills"], ["credit_note", "Debit Notes"]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setDocFilter(key)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${docFilter === key ? "bg-white shadow-sm text-gray-900 font-medium" : "text-gray-500 hover:text-gray-700"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <PageShell header={header} loading={isLoading}>
      <InfoPanel title="About Bills" storageKey="bills-info">
        <p>
          <strong>Bills</strong> are money you owe your suppliers. Each bill records an obligation with a due date and an
          outstanding balance.
        </p>
        <p className="mt-1.5">
          <strong>You don't pay bills from this page.</strong> When a payment leaves your bank account, go to the{" "}
          <Link to="/payments" className="underline font-medium">Payments</Link> page and attribute the payment to this
          vendor — ticking the bill(s) it settled will mark them paid here.
        </p>
        <p className="mt-1.5 text-blue-600">
          Open bills are ordered by due date on the Payments allocation screen so you pay what's due first.
        </p>
      </InfoPanel>
      <DataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        error={error}
        emptyMessage="No bills recorded. Create a new bill to get started."
        onRowClick={(row) => navigate(`/bills/${row.trans_id}`)}
      />
    </PageShell>
  )
}
