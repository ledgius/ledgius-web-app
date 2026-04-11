import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/shared/lib/api"

export interface TaxCode {
  id: number
  code: string
  name: string
  description: string | null
  rate: string
  jurisdiction: string
  tax_type: string
  chart_account_id: number | null
  active: boolean
}

export function useTaxCodes(jurisdiction?: string) {
  return useQuery({
    queryKey: ["tax-codes", jurisdiction],
    queryFn: () => api.get<TaxCode[]>(`/tax-codes${jurisdiction ? `?jurisdiction=${jurisdiction}` : ""}`),
  })
}

export function useCreateTaxCode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<TaxCode>) => api.post<TaxCode>("/tax-codes", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tax-codes"] }),
  })
}
