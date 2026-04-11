import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/shared/lib/api"

export interface RecurringSchedule {
  id: number
  name: string
  description: string | null
  source_type: string
  frequency: string
  rrule: string
  start_date: string
  end_date: string | null
  next_due_date: string
  last_generated: string | null
  auto_approve: boolean
  active: boolean
}

export function useRecurringSchedules() {
  return useQuery({
    queryKey: ["recurring"],
    queryFn: () => api.get<RecurringSchedule[]>("/recurring"),
  })
}

export function useCreateRecurring() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => api.post("/recurring", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recurring"] }),
  })
}
