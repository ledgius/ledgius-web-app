import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/shared/lib/api"

export interface InvoiceSummary {
  trans_id: number
  invnumber: string
  transdate: string | null
  duedate: string | null
  customer_name: string
  meta_number: string
  amount_bc: string
  curr: string
  on_hold: boolean
  approved: boolean
  is_return: boolean
}

export function useInvoices() {
  return useQuery({
    queryKey: ["invoices"],
    queryFn: () => api.get<InvoiceSummary[]>("/invoices"),
  })
}

export interface InvoiceDetail {
  invoice: {
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
  customer_name: string
}

export function useInvoiceDetail(id: number) {
  return useQuery({
    queryKey: ["invoices", id],
    queryFn: () => api.get<InvoiceDetail>(`/invoices/${id}`),
    enabled: id > 0,
  })
}

export function useCreateCreditNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      customer_id: number
      original_invoice_id: number
      credit_note_number: string
      credit_date: string
      amount: number
      reason: string
      curr: string
    }) => api.post("/credit-notes", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] })
      qc.invalidateQueries({ queryKey: ["reports"] })
    },
  })
}

export function useCreateInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: unknown) => api.post("/invoices", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] })
      qc.invalidateQueries({ queryKey: ["reports"] })
    },
  })
}

export function useUpdateDraftInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: unknown }) => api.put(`/invoices/${id}`, data),
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: ["invoices"] })
      qc.invalidateQueries({ queryKey: ["invoices", variables.id] })
      qc.invalidateQueries({ queryKey: ["reports"] })
    },
  })
}
