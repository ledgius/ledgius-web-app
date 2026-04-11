import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/shared/lib/api"

export interface JournalLine {
  account_id: number
  amount: number
  memo?: string
}

export interface JournalEntry {
  id: number
  reference: string
  description: string
  transdate: string
  approved: boolean
  lines: {
    entry_id: number
    chart_id: number
    amount_bc: string
    curr: string
    memo?: string
  }[]
}

export interface PostJournalCmd {
  reference: string
  description: string
  transdate: string
  lines: JournalLine[]
}

export interface PendingApproval {
  trans_id: number
  table_name: string
  reference: string
  description: string
  transdate: string
  trans_type_code: string
}

export function useJournalEntry(id: number) {
  return useQuery({
    queryKey: ["gl", id],
    queryFn: () => api.get<JournalEntry>(`/gl/${id}`),
    enabled: id > 0,
  })
}

export function usePostJournal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: PostJournalCmd) => api.post<JournalEntry>("/gl", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gl"] }),
  })
}

export function usePendingApprovals() {
  return useQuery({
    queryKey: ["approvals", "pending"],
    queryFn: () => api.get<PendingApproval[]>("/approvals/pending"),
  })
}

export function useApproveTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { transaction_id: number; approved_by: number }) =>
      api.post("/approvals/approve", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["approvals"] }),
  })
}

export function useRejectTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { transaction_id: number; rejected_by: string; reason: string }) =>
      api.post("/approvals/reject", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["approvals"] }),
  })
}

export function useYearEndClose() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { fiscal_year_end: string; retained_earnings_account_id: number; curr: string }) =>
      api.post("/gl/year-end", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gl"] })
      qc.invalidateQueries({ queryKey: ["reports"] })
    },
  })
}
