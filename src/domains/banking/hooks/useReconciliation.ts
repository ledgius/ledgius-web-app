// Spec references: R-0019, A-0019
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/shared/lib/api"

// ── Types ────────────────────────────────────────────────────────────────────

export interface MatchCandidate {
  entry_id: number
  trans_id: number
  trans_date: string
  amount: number
  description: string
  account_name: string
  reference: string
  confidence_score: number
  score_components: Record<string, number>
  evidence_chips: string[]
  explanation: string
  match_pass: number
  already_reconciled: boolean
  residual_amount: number
}

export interface QueueItem {
  id: number
  trans_date: string
  amount: number
  description: string
  reference: string
  counterparty_name: string
  normalized_description: string
  reconciliation_status: string
  confidence_score: number | null
  match_pass: number | null
  match_explanation: Record<string, unknown>
  top_candidate: MatchCandidate | null
  candidate_count: number
  exception_count: number
  channel: string | null
  extracted_entities: Record<string, unknown>
}

export interface ReconciliationSummary {
  account_id: number
  total_imported: number
  auto_matched: number
  manually_matched: number
  needs_review: number
  deferred: number
  excluded: number
  exception: number
  unprocessed: number
  total_transactions: number
}

export interface ReconciliationException {
  id: number
  bank_transaction_id: number
  status: string
  priority: string
  reason_code: string
  comment: string
  owner: string | null
  snooze_until: string | null
  created_at: string
  updated_at: string
}

export interface AuditEvent {
  id: number
  bank_transaction_id: number
  event_type: string
  actor: string
  created_at: string
  score_components: Record<string, number>
  details: Record<string, unknown>
}

export interface ReconciliationPrecedent {
  id: number
  bank_account_id: number
  pattern_type: string
  pattern_value: string
  target_account_id: number
  target_account_name: string
  approval_count: number
  confidence_boost: number
  last_matched_at: string
}

export interface MatchRequest {
  match_type: "one_to_one" | "one_to_many" | "many_to_one" | "generated" | "split"
  matched_entry_ids: number[]
  override_reason?: string
}

export interface DeferRequest {
  reason_code: string
  snooze_until?: string
  notes?: string
}

export interface ExcludeRequest {
  reason_code: string
  notes: string
}

export interface BulkAcceptRequest {
  bank_transaction_ids: number[]
  preview?: boolean
}

export interface RunPipelineRequest {
  account_id: number
}

// ── Query Keys ────────────────────────────────────────────────────────────────

const RECON_KEY = ["reconciliation"]

// ── Hooks ─────────────────────────────────────────────────────────────────────

export type QueueSort = "risk_first" | "aged_first" | "amount_first"
export type QueueFilter = "all" | "unmatched" | "needs_review" | "exception" | "auto_matched" | "resolved"

export function useReconQueue(accountId: number, sort: QueueSort = "risk_first", filter: QueueFilter = "all") {
  return useQuery({
    queryKey: [...RECON_KEY, "queue", accountId, sort, filter],
    queryFn: () =>
      api.get<QueueItem[]>(
        `/reconciliation/queue?account_id=${accountId}&sort=${sort}&filter=${filter}`
      ),
    enabled: accountId > 0,
    staleTime: 30_000,
  })
}

export function useReconCandidates(lineId: number | null) {
  return useQuery({
    queryKey: [...RECON_KEY, "candidates", lineId],
    queryFn: () => api.get<{ candidates: MatchCandidate[] }>(`/reconciliation/lines/${lineId}/candidates`),
    enabled: lineId !== null && lineId > 0,
    staleTime: 15_000,
  })
}

export function useReconSummary(accountId: number) {
  return useQuery({
    queryKey: [...RECON_KEY, "summary", accountId],
    queryFn: () => api.get<ReconciliationSummary>(`/reconciliation/summary?account_id=${accountId}`),
    enabled: accountId > 0,
    staleTime: 60_000,
  })
}

export function useReconExceptions(accountId: number) {
  return useQuery({
    queryKey: [...RECON_KEY, "exceptions", accountId],
    queryFn: () => api.get<ReconciliationException[]>(`/reconciliation/exceptions?account_id=${accountId}`),
    enabled: accountId > 0,
  })
}

export function useReconAudit(lineId: number | null) {
  return useQuery({
    queryKey: [...RECON_KEY, "audit", lineId],
    queryFn: () => api.get<AuditEvent[]>(`/reconciliation/lines/${lineId}/audit`),
    enabled: lineId !== null && lineId > 0,
  })
}

export function useReconPrecedents(accountId: number) {
  return useQuery({
    queryKey: [...RECON_KEY, "precedents", accountId],
    queryFn: () => api.get<ReconciliationPrecedent[]>(`/reconciliation/precedents?account_id=${accountId}`),
    enabled: accountId > 0,
  })
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useMatchLine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ lineId, body }: { lineId: number; body: MatchRequest }) =>
      api.post(`/reconciliation/lines/${lineId}/match`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: RECON_KEY }),
  })
}

export function useDeferLine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ lineId, body }: { lineId: number; body: DeferRequest }) =>
      api.post(`/reconciliation/lines/${lineId}/defer`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: RECON_KEY }),
  })
}

export function useExcludeLine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ lineId, body }: { lineId: number; body: ExcludeRequest }) =>
      api.post(`/reconciliation/lines/${lineId}/exclude`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: RECON_KEY }),
  })
}

export function useUndoAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ lineId }: { lineId: number }) =>
      api.post(`/reconciliation/lines/${lineId}/undo`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: RECON_KEY }),
  })
}

export function useBulkAccept() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: BulkAcceptRequest) =>
      api.post("/reconciliation/bulk/accept", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: RECON_KEY }),
  })
}

export function useRunPipeline() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: RunPipelineRequest) =>
      api.post("/reconciliation/run-pipeline", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: RECON_KEY }),
  })
}
