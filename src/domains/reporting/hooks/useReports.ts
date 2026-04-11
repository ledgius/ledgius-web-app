import { useQuery } from "@tanstack/react-query"
import { api } from "@/shared/lib/api"

export interface TrialBalanceLine {
  accno: string
  description: string
  category: string
  debit: string
  credit: string
}

export interface ProfitLossReport {
  from_date: string
  to_date: string
  income: { accno: string; description: string; amount: string }[]
  expenses: { accno: string; description: string; amount: string }[]
  net_profit: string
}

export interface BalanceSheetReport {
  as_at_date: string
  assets: { accno: string; description: string; balance: string }[]
  liabilities: { accno: string; description: string; balance: string }[]
  equity: { accno: string; description: string; balance: string }[]
  total_assets: string
  total_liabilities: string
  total_equity: string
}

export function useTrialBalance() {
  return useQuery({
    queryKey: ["reports", "trial-balance"],
    queryFn: () => api.get<TrialBalanceLine[]>("/reports/trial-balance"),
  })
}

export function useProfitLoss(from: string, to: string) {
  return useQuery({
    queryKey: ["reports", "profit-loss", from, to],
    queryFn: () => api.get<ProfitLossReport>(`/reports/profit-loss?from_date=${from}&to_date=${to}`),
    enabled: !!from && !!to,
  })
}

export function useBalanceSheet(date: string) {
  return useQuery({
    queryKey: ["reports", "balance-sheet", date],
    queryFn: () => api.get<BalanceSheetReport>(`/reports/balance-sheet?date=${date}`),
    enabled: !!date,
  })
}

// --- WP5 Report Hooks ---

export interface AgeingBucket {
  current: string; days_30: string; days_60: string; days_90: string; over_90: string; total: string
}

export interface AgeingReport {
  as_at_date: string
  type: string
  lines: { contact_id: number; contact_name: string; meta_number: string; buckets: AgeingBucket }[]
  totals: AgeingBucket
}

export interface GLDetailReport {
  account_id: number; accno: string; account_name: string
  from_date: string; to_date: string
  opening_balance: string; closing_balance: string
  lines: { entry_id: number; trans_id: number; transdate: string; reference: string; description: string; debit: string; credit: string; balance: string }[]
}

export interface CashFlowReport {
  from_date: string; to_date: string
  operating: { label: string; items: { description: string; amount: string }[]; total: string }
  investing: { label: string; items: { description: string; amount: string }[]; total: string }
  financing: { label: string; items: { description: string; amount: string }[]; total: string }
  net_change: string; opening_cash: string; closing_cash: string
}

export function useARAgeingReport(date?: string) {
  return useQuery({
    queryKey: ["reports", "ar-ageing", date],
    queryFn: () => api.get<AgeingReport>(`/reports/ar-ageing${date ? `?date=${date}` : ""}`),
  })
}

export function useAPAgeingReport(date?: string) {
  return useQuery({
    queryKey: ["reports", "ap-ageing", date],
    queryFn: () => api.get<AgeingReport>(`/reports/ap-ageing${date ? `?date=${date}` : ""}`),
  })
}

export function useGLDetailReport(accountId: number, from: string, to: string) {
  return useQuery({
    queryKey: ["reports", "gl-detail", accountId, from, to],
    queryFn: () => api.get<GLDetailReport>(`/reports/gl-detail?account_id=${accountId}&from_date=${from}&to_date=${to}`),
    enabled: accountId > 0 && !!from && !!to,
  })
}

export function useCashFlowReport(from: string, to: string) {
  return useQuery({
    queryKey: ["reports", "cash-flow", from, to],
    queryFn: () => api.get<CashFlowReport>(`/reports/cash-flow?from_date=${from}&to_date=${to}`),
    enabled: !!from && !!to,
  })
}

export interface StatementReport {
  contact_id: number
  contact_name: string
  meta_number: string
  contact_type: string
  as_at_date: string
  opening_balance: string
  closing_balance: string
  lines: {
    trans_id: number
    transdate: string | null
    reference: string
    description: string
    amount: string
    balance: string
    type: string
  }[]
}

export function useCustomerStatement(customerId: number, asAt?: string) {
  const qs = `customer_id=${customerId}${asAt ? `&as_at=${asAt}` : ""}`
  return useQuery({
    queryKey: ["reports", "customer-statement", customerId, asAt],
    queryFn: () => api.get<StatementReport>(`/reports/customer-statement?${qs}`),
    enabled: customerId > 0,
  })
}

export function useVendorStatement(vendorId: number, asAt?: string) {
  const qs = `vendor_id=${vendorId}${asAt ? `&as_at=${asAt}` : ""}`
  return useQuery({
    queryKey: ["reports", "vendor-statement", vendorId, asAt],
    queryFn: () => api.get<StatementReport>(`/reports/vendor-statement?${qs}`),
    enabled: vendorId > 0,
  })
}
