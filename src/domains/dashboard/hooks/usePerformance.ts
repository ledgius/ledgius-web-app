// Spec references: A-0023.
import { useQuery } from "@tanstack/react-query"
import { api } from "@/shared/lib/api"

// ── API response types ──

export interface PerformanceMonth {
  month: string
  revenue: number
  expenses: number
  net: number
}

export interface PerformancePriorYear {
  months: PerformanceMonth[]
  total_revenue: number
  total_expenses: number
  total_net: number
}

export interface PerformanceData {
  months: PerformanceMonth[]
  total_revenue: number
  total_expenses: number
  total_net: number
  prior_year: PerformancePriorYear | null
}

// ── Query hook ──

export function usePerformance() {
  return useQuery<PerformanceData>({
    queryKey: ["performance"],
    queryFn: () => api.get<PerformanceData>("/reports/performance"),
  })
}
