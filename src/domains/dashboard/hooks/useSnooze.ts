// Spec references: A-0023.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/shared/lib/api"

/** Maps health-derived action links to canonical snooze action keys. */
export const ACTION_KEY_MAP: Record<string, string> = {
  "/invoices": "overdue_invoices",
  "/invoices?filter=overdue": "overdue_invoices",
  "/payments": "overdue_bills",
  "/captured-receipts": "missing_receipts",
  "/bas": "uncoded_gst",
  "/bank-reconciliation": "unmatched_bank",
}

export interface ActiveSnooze {
  action_key: string
  snoozed_until: string
  note?: string
}

interface SnoozeRequest {
  action_key: string
  days: number
  note?: string
}

export function useActiveSnoozes() {
  return useQuery({
    queryKey: ["books-health-snoozes"],
    queryFn: () => api.get<ActiveSnooze[]>("/books-health/snoozes"),
    staleTime: 30_000,
  })
}

export function useSnoozeAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: SnoozeRequest) => api.post("/books-health/snooze", req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["books-health-snoozes"] })
      qc.invalidateQueries({ queryKey: ["books-health"] })
    },
  })
}

/** Look up whether an action link is currently snoozed, and if so until when. */
export function findSnoozeForLink(
  link: string,
  snoozes: ActiveSnooze[] | undefined
): ActiveSnooze | undefined {
  if (!snoozes) return undefined
  const key = ACTION_KEY_MAP[link]
  if (!key) return undefined
  return snoozes.find((s) => s.action_key === key)
}
