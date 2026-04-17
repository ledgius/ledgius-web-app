// Spec references: R-0063.
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell } from "@/components/layout"
import { Button, InfoPanel } from "@/components/primitives"
import { MoneyValue, DateValue } from "@/components/financial"
import { DataTable, type Column } from "@/shared/components/DataTable"
import { Plus } from "lucide-react"

interface LoanPayment {
  id: string
  date: string
  loan_name: string
  principal: number
  interest: number
  total_payment: number
  balance_after: number
}

const columns: Column<LoanPayment>[] = [
  {
    key: "date",
    header: "Date",
    className: "w-28",
    render: (r: LoanPayment) => <DateValue value={r.date} format="short" />,
  },
  {
    key: "loan_name",
    header: "Loan",
    render: (r: LoanPayment) => (
      <span className="text-primary-600 font-medium">{r.loan_name}</span>
    ),
  },
  {
    key: "principal",
    header: "Principal",
    className: "w-32 text-right",
    render: (r: LoanPayment) => (
      <div className="text-right">
        <MoneyValue amount={r.principal} currency="AUD" />
      </div>
    ),
  },
  {
    key: "interest",
    header: "Interest",
    className: "w-32 text-right",
    render: (r: LoanPayment) => (
      <div className="text-right">
        <MoneyValue amount={r.interest} currency="AUD" />
      </div>
    ),
  },
  {
    key: "total_payment",
    header: "Total Payment",
    className: "w-32 text-right",
    render: (r: LoanPayment) => (
      <div className="text-right font-medium">
        <MoneyValue amount={r.total_payment} currency="AUD" />
      </div>
    ),
  },
  {
    key: "balance_after",
    header: "Balance After",
    className: "w-36 text-right",
    render: (r: LoanPayment) => (
      <div className="text-right tabular-nums">
        <MoneyValue amount={r.balance_after} currency="AUD" />
      </div>
    ),
  },
]

export function LoanPaymentsPage() {
  usePageHelp(pageHelpContent.loanPayments)
  usePagePolicies(["account"])
  const navigate = useNavigate()

  // API not built yet — empty array shows the empty state
  const [payments] = useState<LoanPayment[]>([])
  const isLoading = false

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Loan Payments</h1>
        {payments.length > 0 && (
          <span className="text-sm text-gray-500">{payments.length} payment{payments.length !== 1 ? "s" : ""}</span>
        )}
      </div>
      <p className="text-sm text-gray-500 mt-0.5">Record and review loan repayments with principal and interest splits</p>
      <div className="flex items-center gap-3 mt-3">
        <Button onClick={() => navigate("/loans/payments/new")}>
          <Plus className="h-4 w-4" />
          Record Payment
        </Button>
      </div>
    </div>
  )

  return (
    <PageShell header={header} loading={isLoading}>
      <InfoPanel title="About Loan Payments" storageKey="loan-payments-info">
        <p>
          Each loan payment splits into principal (reduces the loan balance) and interest (expense).
          Record payments here to keep your loan balances accurate and interest expenses up to date.
        </p>
      </InfoPanel>

      <DataTable
        columns={columns}
        data={payments}
        loading={isLoading}
        emptyMessage="No loan payments recorded. Record a payment to track principal and interest splits."
      />
    </PageShell>
  )
}
