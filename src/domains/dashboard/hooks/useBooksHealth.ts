// Spec references: A-0023.
import { useQuery } from "@tanstack/react-query"
import { api } from "@/shared/lib/api"

export type HealthStatus = "green" | "amber" | "red"

export interface AgeBucket {
  count: number
  amount: number
}

export interface AgeBuckets {
  current: AgeBucket
  days_30: AgeBucket
  days_60: AgeBucket
  days_90: AgeBucket
}

export interface BankReconAccount {
  account_id: number
  account_name: string
  last_reconciled: string
  days_since: number
  unmatched_count: number
  variance: number
}

export interface BankReconHealth {
  status: HealthStatus
  summary: string
  accounts: BankReconAccount[]
}

export interface ReceivablesHealth {
  status: HealthStatus
  summary: string
  total_outstanding: number
  avg_days_to_payment: number
  buckets: AgeBuckets
}

export interface PayablesHealth {
  status: HealthStatus
  summary: string
  total_outstanding: number
  due_this_week: number
  buckets: AgeBuckets
}

export interface CashPositionHealth {
  status: HealthStatus
  summary: string
  current_balance: number
  net_cash_flow_month: number
  projected_end_of_month: number
  trend: "up" | "down" | "flat"
}

export interface ExpenseDocHealth {
  status: HealthStatus
  summary: string
  total_expenses: number
  with_receipt: number
  without_receipt: number
  uncoded_count: number
  coverage_percent: number
}

export interface GSTBASHealth {
  status: HealthStatus
  summary: string
  period: string
  lodgement_deadline: string
  total_transactions: number
  coded_count: number
  uncoded_count: number
  gst_collected: number
  gst_paid: number
  net_gst_position: number
  prior_quarter_lodged: boolean
}

export interface PeriodCloseChecklist {
  bank_reconciled: boolean
  journals_posted: boolean
  adjustments_reviewed: boolean
  gst_reconciled: boolean
  period_locked: boolean
}

export interface PeriodCloseHealth {
  status: HealthStatus
  summary: string
  current_period: string
  days_remaining: number
  prior_month_closed: boolean
  checklist: PeriodCloseChecklist
}

export interface BooksHealthResponse {
  bank_reconciliation: BankReconHealth
  receivables: ReceivablesHealth
  payables: PayablesHealth
  cash_position: CashPositionHealth
  expense_documentation: ExpenseDocHealth
  gst_bas_readiness: GSTBASHealth
  period_close: PeriodCloseHealth
  last_updated: string
}

export function useBooksHealth() {
  return useQuery({
    queryKey: ["books-health"],
    queryFn: () => api.get<BooksHealthResponse>("/books-health"),
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}
