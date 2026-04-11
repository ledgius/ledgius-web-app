import { useQuery } from "@tanstack/react-query"
import { api } from "@/shared/lib/api"

export interface DashboardMetrics {
  ar_outstanding: string
  ap_outstanding: string
  gst_collected: string
  gst_paid: string
  gst_position: string
  bank_balance: string
  recent_txn_count: number
}

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<DashboardMetrics>("/dashboard"),
    refetchInterval: 60_000,
  })
}
