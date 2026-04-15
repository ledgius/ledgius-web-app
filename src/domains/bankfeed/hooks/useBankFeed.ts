// Spec references: R-0049, A-0025, T-0026 (T-0026.14, T-0026.15).
// React Query hooks for the bank feeds (Basiq) domain.
//
// Authoritative API surface (see ledgius-api/internal/bankfeed/handler.go):
//   POST   /api/v1/bank-feeds/connect
//   GET    /api/v1/bank-feeds/connections
//   GET    /api/v1/bank-feeds/connections/:id
//   POST   /api/v1/bank-feeds/connections/:id/map
//   POST   /api/v1/bank-feeds/connections/:id/sync
//   POST   /api/v1/bank-feeds/connections/:id/reauthorise

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/shared/lib/api"

export type ConnectionStatus =
  | "pending"
  | "active"
  | "expiring"
  | "expired"
  | "disconnected"
  | "error"

export interface BankFeedConnection {
  id: number
  provider_user_id: number
  bank_account_id: number | null
  provider_connection_id: string
  provider_account_id: string
  institution_id: string
  institution_name: string
  account_name: string | null
  account_number_mask: string | null
  bsb: string | null
  status: ConnectionStatus
  consent_expires_at: string | null
  last_sync_at: string | null
  last_sync_status: "success" | "partial" | "failed" | null
  last_sync_error: string | null
  transactions_synced: number
  created_at: string
  updated_at: string
}

export interface ConnectInitResponse {
  consent_url: string
  event_id: number
  basiq_user: string
}

export interface SyncOutcome {
  ConnectionID: number
  Fetched: number
  Inserted: number
  Duplicates: number
  SyncFrom: string
  SyncTo: string
  JobID: string
}

const KEY = ["bank-feeds", "connections"]

export function useBankFeedConnections(opts?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: KEY,
    queryFn: () => api.get<BankFeedConnection[]>("/bank-feeds/connections"),
    refetchInterval: opts?.refetchInterval,
  })
}

export function useBankFeedConnection(id: number) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => api.get<BankFeedConnection>(`/bank-feeds/connections/${id}`),
    enabled: id > 0,
  })
}

export function useConnectBank() {
  return useMutation({
    mutationFn: (body: { contact_email: string }) =>
      api.post<ConnectInitResponse>("/bank-feeds/connect", body),
  })
}

export function useMapBankFeedAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, bank_account_id }: { id: number; bank_account_id: number }) =>
      api.post<BankFeedConnection>(`/bank-feeds/connections/${id}/map`, { bank_account_id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useSyncBankFeed() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, backfill_days }: { id: number; backfill_days?: number }) =>
      api.post<SyncOutcome>(`/bank-feeds/connections/${id}/sync`, { backfill_days: backfill_days ?? 0 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useReauthoriseBankFeed() {
  return useMutation({
    mutationFn: (id: number) =>
      api.post<{ consent_url: string; event_id: number }>(
        `/bank-feeds/connections/${id}/reauthorise`,
        {},
      ),
  })
}

// --- Display helpers ---

export function statusVariant(status: ConnectionStatus): "default" | "success" | "warning" | "danger" {
  switch (status) {
    case "active":
      return "success"
    case "pending":
      return "default"
    case "expiring":
      return "warning"
    case "expired":
    case "error":
    case "disconnected":
      return "danger"
  }
}

// worstStatus returns the highest-severity connection status across a list,
// used by the header indicator to decide its colour.
export function worstStatus(rows: BankFeedConnection[]): ConnectionStatus | null {
  if (rows.length === 0) return null
  const order: ConnectionStatus[] = ["expired", "error", "disconnected", "expiring", "pending", "active"]
  for (const s of order) {
    if (rows.some(r => r.status === s)) return s
  }
  return null
}
