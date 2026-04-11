import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/shared/lib/api"

export interface ReceiptSummary {
  trans_id: number
  reference: string
  receipt_date: string
  customer_name: string
  amount: string
  curr: string
  approved: boolean
}

export interface ReceiptAllocation {
  invoice_trans_id: number
  amount: number
}

export interface CreateReceiptCmd {
  bank_account_id: number
  customer_id: number
  receipt_date: string
  reference: string
  curr: string
  notes?: string
  allocations: ReceiptAllocation[]
}

export function useReceipts() {
  return useQuery({
    queryKey: ["receipts"],
    queryFn: () => api.get<ReceiptSummary[]>("/receipts"),
  })
}

export function useCreateReceipt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateReceiptCmd) => api.post("/receipts", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["receipts"] })
      qc.invalidateQueries({ queryKey: ["invoices"] })
    },
  })
}
