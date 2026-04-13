import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/shared/lib/api"

export interface UnclearedTransaction {
  entry_id: number
  trans_id: number
  chart_id: number
  transdate: string
  amount_bc: string
  curr: string
  reference: string
  description: string
  cleared: boolean
}

export interface ReconciliationStatus {
  cleared_balance: string
  statement_balance: string
  difference: string
  is_reconciled: boolean
}

export interface ImportBatch {
  id: number
  account_id: number
  file_name: string
  file_format: string
  imported_at: string
  total_rows: number
  matched_rows: number
  status: string
}

export interface BankTransaction {
  id: number
  import_batch_id: number
  external_id: string
  trans_date: string
  amount: string
  description: string
  reference: string
  match_status: string
  matched_by: string
}

export function useUnclearedTransactions(accountId: number, endDate?: string) {
  return useQuery({
    queryKey: ["bank", accountId, "uncleared", endDate],
    queryFn: () => api.get<UnclearedTransaction[]>(
      `/bank/${accountId}/uncleared${endDate ? `?end_date=${endDate}` : ""}`
    ),
    enabled: accountId > 0,
  })
}

export function useReconciliationStatus(accountId: number, statementBalance?: string) {
  return useQuery({
    queryKey: ["bank", accountId, "status", statementBalance],
    queryFn: () => api.get<ReconciliationStatus>(
      `/bank/${accountId}/status?statement_balance=${statementBalance}`
    ),
    enabled: accountId > 0 && !!statementBalance,
  })
}

export function useImportBatches(accountId: number) {
  return useQuery({
    queryKey: ["bank", accountId, "batches"],
    queryFn: () => api.get<ImportBatch[]>(`/bank/${accountId}/batches`),
    enabled: accountId > 0,
  })
}

export function useUnmatchedTransactions(accountId: number) {
  return useQuery({
    queryKey: ["bank", accountId, "unmatched"],
    queryFn: () => api.get<BankTransaction[]>(`/bank/${accountId}/unmatched`),
    enabled: accountId > 0,
  })
}

export function useImportBankFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { account_id: number; file_name: string; format: string; content: string }) =>
      api.post("/bank-import", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bank"] }),
  })
}

export interface BankRule {
  id: number
  account_id: number
  name: string
  description_pattern: string | null
  reference_pattern: string | null
  match_account_id: number
  enabled: boolean
  priority: number
}

export function useBankRules(accountId: number) {
  return useQuery({
    queryKey: ["bank", accountId, "rules"],
    queryFn: () => api.get<BankRule[]>(`/bank/${accountId}/rules`),
    enabled: accountId > 0,
  })
}

export function useDeleteBankRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ruleId: number) => api.delete(`/bank-import/rules/${ruleId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bank"] }),
  })
}

export function useUpdateRulePriority() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ruleId, priority }: { ruleId: number; priority: number }) =>
      api.patch(`/bank-import/rules/${ruleId}/priority`, { priority }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bank"] }),
  })
}

export function useMatchTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { bank_transaction_id: number; entry_id: number }) =>
      api.post("/bank-import/match", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bank"] }),
  })
}
