import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/shared/lib/api"

export interface TimelineItem {
  id: string
  title: string
  description?: string
  date: string
  type: "auto" | "task"
  category: string
  icon?: string
  done: boolean
  done_at?: string
  done_by?: string
  overdue: boolean
  badge?: string
  link?: string
}

export interface TimelineSummary {
  overdue_count: number
  today_count: number
  upcoming_count: number
}

export interface TimelineResponse {
  items: TimelineItem[]
  summary: TimelineSummary
}

export interface CreateTaskCmd {
  title: string
  description?: string
  due_date: string
  priority?: string
  link?: string
  assigned_to?: string
}

export function useCalendarTimeline(days = 7) {
  return useQuery({
    queryKey: ["calendar", "timeline", days],
    queryFn: () => api.get<TimelineResponse>(`/calendar/timeline?days=${days}`),
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

export function useCreateCalendarTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTaskCmd) => api.post("/calendar/tasks", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar"] }),
  })
}

export function useCompleteCalendarTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post(`/calendar/tasks/${id}/complete`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar"] }),
  })
}

export function useCancelCalendarTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/calendar/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar"] }),
  })
}
