import { useQuery } from "@tanstack/react-query"
import { api } from "@/shared/lib/api"

export interface BASReport {
  period: { from_date: string; to_date: string; label: string }
  G1: string; G2: string; G3: string; G4: string; G5: string
  G6: string; G7: string; G8: string; G9: string
  G10: string; G11: string; G12: string; G13: string
  G14: string; G15: string; G16: string; G17: string
  G18: string; G19: string; G20: string
  "1A": string; "1B": string
  W1: string; W2: string; W3: string; W4: string
  gst_owed: string; payg_owed: string; total_owed: string
}

export interface GSTDetailLine {
  trans_id: number
  transdate: string | null
  reference: string | null
  description: string | null
  net_amount: string
  gst_amount: string
  gross_amount: string
  trans_type: string
  contact_name: string | null
}

export function useBAS(from: string, to: string) {
  return useQuery({
    queryKey: ["tax", "bas", from, to],
    queryFn: () => api.get<BASReport>(`/tax/bas?from_date=${from}&to_date=${to}`),
    enabled: !!from && !!to,
  })
}

export function useGSTDetail(from: string, to: string) {
  return useQuery({
    queryKey: ["tax", "gst-detail", from, to],
    queryFn: () => api.get<{ sales: GSTDetailLine[]; purchases: GSTDetailLine[] }>(`/tax/gst-detail?from_date=${from}&to_date=${to}`),
    enabled: !!from && !!to,
  })
}
