import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/shared/lib/api"

export interface PaymentSummary {
  trans_id: number
  reference: string
  payment_date: string
  vendor_name: string
  vendor_id?: number | null
  vendor_source?: "" | "lsmb" | "override"
  amount: string
  curr: string
  approved: boolean
  bill_refs: string
}

export interface GLLine {
  acc_trans_id: number
  chart_id: number
  account_no: string
  account_name: string
  amount_bc: string
  open_item_id?: number | null
}

export interface BillAllocation {
  bill_trans_id: number
  bill_ref: string
  bill_date?: string
  amount: string
}

export interface PaymentDetail extends PaymentSummary {
  description?: string
  gl_lines: GLLine[]
  allocations: BillAllocation[]
}

export interface AttachVendorCmd {
  vendor_id: number
  notes?: string
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

export function usePayment(transId: number) {
  return useQuery({
    queryKey: ["payments", transId],
    queryFn: () => api.get<PaymentDetail>(`/payments/${transId}`),
    enabled: transId > 0,
  })
}

export function useAttachVendor(transId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (cmd: AttachVendorCmd) =>
      api.post<PaymentDetail>(`/payments/${transId}/attach-vendor`, cmd),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] })
      qc.invalidateQueries({ queryKey: ["payments", transId] })
    },
  })
}
