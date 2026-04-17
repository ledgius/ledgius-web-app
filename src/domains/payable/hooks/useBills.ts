import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/shared/lib/api"

export interface BillSummary {
  trans_id: number
  invnumber: string
  transdate: string | null
  duedate: string | null
  vendor_id: number
  vendor_name: string
  meta_number: string
  amount_bc: string
  curr: string
  on_hold: boolean
  approved: boolean
  is_return: boolean
}

export function useBills() {
  return useQuery({
    queryKey: ["bills"],
    queryFn: () => api.get<BillSummary[]>("/bills"),
  })
}

export interface BillDetail {
  bill: {
    trans_id: number
    invnumber: string
    tax_included: boolean
    duedate: string | null
    invoice: boolean
    curr: string
    notes: string | null
    entity_credit_account: number
    is_return: boolean
    approved: boolean
    amount_bc: string
    netamount_bc: string
  }
  lines: {
    id: number
    trans_id: number
    description: string | null
    qty: string
    sellprice: string
  }[]
  vendor_name: string
}

export function useBillDetail(id: number) {
  return useQuery({
    queryKey: ["bills", id],
    queryFn: () => api.get<BillDetail>(`/bills/${id}`),
    enabled: id > 0,
  })
}

export function useCreateDebitNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      vendor_id: number
      original_bill_id: number
      debit_note_number: string
      debit_date: string
      amount: number
      reason: string
      curr: string
    }) => api.post("/debit-notes", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bills"] })
      qc.invalidateQueries({ queryKey: ["reports"] })
    },
  })
}

export function useCreateBill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => api.post("/bills", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bills"] })
      qc.invalidateQueries({ queryKey: ["reports"] })
    },
  })
}
