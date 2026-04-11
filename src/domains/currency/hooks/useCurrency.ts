import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/shared/lib/api"

export interface Currency { curr: string; description: string | null }
export interface ExchangeRate { id: number; from_curr: string; to_curr: string; rate: string; effective_date: string; source: string | null }

export function useCurrencies() {
  return useQuery({ queryKey: ["currencies"], queryFn: () => api.get<Currency[]>("/currencies") })
}

export function useExchangeRates(from?: string, to?: string) {
  const qs = [from && `from=${from}`, to && `to=${to}`].filter(Boolean).join("&")
  return useQuery({
    queryKey: ["exchange-rates", from, to],
    queryFn: () => api.get<ExchangeRate[]>(`/exchange-rates${qs ? `?${qs}` : ""}`),
  })
}

export function useCreateRate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { from_curr: string; to_curr: string; rate: string; effective_date: string; source?: string }) =>
      api.post("/exchange-rates", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exchange-rates"] }),
  })
}
