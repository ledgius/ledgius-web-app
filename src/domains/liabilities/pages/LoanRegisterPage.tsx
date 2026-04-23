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

interface Loan {
  id: string
  name: string
  lender: string
  original_amount: number
  current_balance: number
  interest_rate: number
  repayment_frequency: string
  next_payment_due: string
}

const frequencyLabels: Record<string, string> = {
  weekly: "Weekly",
  fortnightly: "Fortnightly",
  monthly: "Monthly",
  quarterly: "Quarterly",
}

const columns: Column<Loan>[] = [
  {
    key: "name",
    header: "Loan Name",
    render: (r: Loan) => (
      <span className="text-primary-600 hover:underline cursor-pointer font-medium">
        {r.name}
      </span>
    ),
  },
  {
    key: "lender",
    header: "Lender",
    className: "w-36",
    render: (r: Loan) => <span className="text-gray-600">{r.lender}</span>,
  },
  {
    key: "original_amount",
    header: "Original Amount",
    className: "w-36 text-right",
    render: (r: Loan) => (
      <div className="text-right">
        <MoneyValue amount={r.original_amount} currency="AUD" />
      </div>
    ),
  },
  {
    key: "current_balance",
    header: "Current Balance",
    className: "w-36 text-right",
    render: (r: Loan) => (
      <div className="text-right font-medium">
        <MoneyValue amount={r.current_balance} currency="AUD" />
      </div>
    ),
  },
  {
    key: "interest_rate",
    header: "Interest Rate",
    className: "w-28 text-right",
    render: (r: Loan) => (
      <div className="text-right tabular-nums">{r.interest_rate.toFixed(2)}%</div>
    ),
  },
  {
    key: "repayment_frequency",
    header: "Repayment Frequency",
    className: "w-40",
    render: (r: Loan) => frequencyLabels[r.repayment_frequency] ?? r.repayment_frequency,
  },
  {
    key: "next_payment_due",
    header: "Next Payment Due",
    className: "w-36",
    render: (r: Loan) => <DateValue value={r.next_payment_due} format="short" />,
  },
]

export function LoanRegisterPage() {
  usePageHelp(pageHelpContent.loanRegister)
  usePagePolicies(["account", "tax", "liabilities"])
  const navigate = useNavigate()

  // API not built yet — empty array shows the empty state
  const [loans] = useState<Loan[]>([])
  const isLoading = false

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Loan Register</h1>
        {loans.length > 0 && (
          <span className="text-sm text-gray-500">{loans.length} loan{loans.length !== 1 ? "s" : ""}</span>
        )}
      </div>
      <p className="text-sm text-gray-500 mt-0.5">Track every financing arrangement and its repayment schedule</p>
      <div className="flex items-center gap-3 mt-3">
        <Button onClick={() => navigate("/loans/new")}>
          <Plus className="h-4 w-4" />
          Add Loan
        </Button>
      </div>
    </div>
  )

  return (
    <PageShell header={header} loading={isLoading}>
      <InfoPanel title="About Loans" storageKey="loan-register-info">
        <p>
          Your loan register tracks every financing arrangement — bank loans, equipment finance,
          vehicle chattel mortgages. Each loan carries its balance, repayment schedule, and interest rate.
        </p>
      </InfoPanel>

      <DataTable
        columns={columns}
        data={loans}
        loading={isLoading}
        emptyMessage="No loans recorded. Add a loan to start tracking repayments and interest."
        onRowClick={(row) => navigate(`/loans/${row.id}`)}
      />
    </PageShell>
  )
}
