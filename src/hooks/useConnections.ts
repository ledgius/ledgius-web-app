// Spec references: R-0064, R-0066, R-0067.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/shared/lib/api"

export interface ConnectionStatus {
  system_code: string
  org_name: string | null
  status: string
  connected_at: string
  connected_by: string | null
}

const CONN_KEY = ["connections"]

export function useConnections() {
  return useQuery({
    queryKey: CONN_KEY,
    queryFn: () => api.get<ConnectionStatus[]>("/connections"),
  })
}

export function useDisconnect() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (system: string) => api.delete(`/connect/${system}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: CONN_KEY }),
  })
}

export function usePull() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (system: string) => {
      const path = system === "quickbooks" ? "/quickbooks/pull" : `/api/${system}/pull`
      return api.post(path, {})
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CONN_KEY }),
  })
}

export function usePush() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (system: string) => {
      const path = system === "quickbooks" ? "/quickbooks/push" : `/api/${system}/push`
      return api.post(path, {})
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CONN_KEY }),
  })
}
