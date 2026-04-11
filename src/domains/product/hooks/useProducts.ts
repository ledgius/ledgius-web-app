import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/shared/lib/api"

export interface Product {
  id: number
  sku: string | null
  name: string
  description: string | null
  product_type: string
  unit: string | null
  sell_price: string
  buy_price: string
  sell_tax_code_id: number | null
  buy_tax_code_id: number | null
  income_account_id: number | null
  expense_account_id: number | null
  active: boolean
}

export function useProducts(type?: string, search?: string) {
  const params = new URLSearchParams()
  if (type) params.set("type", type)
  if (search) params.set("search", search)
  const qs = params.toString()

  return useQuery({
    queryKey: ["products", type, search],
    queryFn: () => api.get<Product[]>(`/products${qs ? `?${qs}` : ""}`),
  })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Product>) => api.post<Product>("/products", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  })
}
