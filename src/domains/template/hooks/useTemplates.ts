import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/shared/lib/api"

export interface TransactionTemplate {
  id: number
  name: string
  description: string | null
  source_type: string
  template_json: any
  created_by: string | null
}

export function useTemplates() {
  return useQuery({ queryKey: ["templates"], queryFn: () => api.get<TransactionTemplate[]>("/templates") })
}

export function useCreateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => api.post("/templates", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  })
}

export function useDeleteTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  })
}
