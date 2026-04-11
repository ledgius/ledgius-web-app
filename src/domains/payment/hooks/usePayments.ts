import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/shared/lib/api"

export interface PaymentSummary {
  trans_id: number
  reference: string
  payment_date: string
  vendor_name: string
  amount: string
  curr: string
  approved: boolean
}

export interface PaymentAllocation {
  bill_trans_id: number
  amount: number
}

export interface CreatePaymentCmd {
  bank_account_id: number
  vendor_id: number
  payment_date: string
  reference: string
  curr: string
  notes?: string
  allocations: PaymentAllocation[]
}

export function usePayments() {
  return useQuery({
    queryKey: ["payments"],
    queryFn: () => api.get<PaymentSummary[]>("/payments"),
  })
}

export function useCreatePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePaymentCmd) => api.post("/payments", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] })
      qc.invalidateQueries({ queryKey: ["bills"] })
    },
  })
}
