import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/shared/lib/api"

export interface CapturedReceipt {
  id: number
  thumbnail_data?: string
  file_name: string
  mime_type: string
  file_size_bytes: number
  ocr_vendor?: string
  ocr_amount?: string
  ocr_date?: string
  ocr_currency?: string
  ocr_description?: string
  ocr_raw_text?: string
  vendor?: string
  amount?: string
  receipt_date?: string
  currency?: string
  description?: string
  category?: string
  bank_transaction_id?: number
  expense_account_id?: number
  status: string
  notes?: string
  uploaded_by?: string
  created_at: string
  updated_at: string
}

export interface CapturedReceiptDetail extends CapturedReceipt {
  image_data: string
}

export function useCaptures() {
  return useQuery({
    queryKey: ["captures"],
    queryFn: () => api.get<CapturedReceipt[]>("/captures"),
  })
}

export function useCapture(id: number) {
  return useQuery({
    queryKey: ["captures", id],
    queryFn: () => api.get<CapturedReceiptDetail>(`/captures/${id}`),
    enabled: id > 0,
  })
}

export function useUpdateCapture() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      api.put<CapturedReceipt>(`/captures/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["captures"] }),
  })
}

export function useDeleteCapture() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/captures/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["captures"] }),
  })
}
