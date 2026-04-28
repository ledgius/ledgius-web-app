import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/shared/lib/api"
import type { DecimalString } from "@/shared/lib/decimal"

export interface Employee {
  id: number; first_name: string; last_name: string; email: string | null
  phone: string | null; date_of_birth: string | null
  start_date: string; end_date: string | null
  employment_type: string; pay_cycle: string; residency_status: string
  tfn_provided: boolean; tax_free_threshold: boolean; help_debt: boolean
  sfss_debt: boolean; active: boolean
  super_fund_name: string | null; super_fund_abn: string | null
  super_fund_usi: string | null; super_member_number: string | null
  bank_bsb: string | null; bank_account_number: string | null; bank_account_name: string | null
  // R-0005 PAY-STP-013/039 + A-0049: TFN handling. The cleartext TFN
  // is never returned to the frontend — only the receipt fields below.
  tfn_supplied_at: string | null
}

// Receipt returned by PUT /employees/:id/tfn. Deliberately never echoes
// the cleartext TFN — it's stored encrypted server-side and decrypted
// only at PAYEVNT-build time.
export interface SetEmployeeTFNResponse {
  employee_id: number
  tfn_provided: boolean
  tfn_supplied_at: string
}

// useSetEmployeeTFN encrypts and stores the supplied TFN via the
// API setter endpoint. The cleartext value travels over TLS to the
// API and is never persisted in browser state beyond the input box's
// lifetime — callers MUST clear their input state after a successful
// mutation. Spec references: R-0005 PAY-STP-013/039, A-0049.
export function useSetEmployeeTFN(employeeId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (tfn: string) =>
      api.put<SetEmployeeTFNResponse>(`/employees/${employeeId}/tfn`, { tfn }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees", employeeId] })
      qc.invalidateQueries({ queryKey: ["employees"] })
    },
  })
}

// useClearEmployeeTFN nulls the encrypted TFN columns server-side.
// Used when withdrawing a TFN (e.g. record was created in error).
export function useClearEmployeeTFN(employeeId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete<void>(`/employees/${employeeId}/tfn`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees", employeeId] })
      qc.invalidateQueries({ queryKey: ["employees"] })
    },
  })
}

export function useEmployee(id: number) {
  return useQuery({
    queryKey: ["employees", id],
    queryFn: () => api.get<Employee>(`/employees/${id}`),
    enabled: id > 0,
  })
}

export interface PayRun {
  id: number; pay_period_start: string; pay_period_end: string; payment_date: string
  status: string
  total_gross: DecimalString; total_tax: DecimalString; total_super: DecimalString; total_net: DecimalString
  employee_count: number
  stp_status?: "pending" | "accepted" | "failed" | "submitted" | null
  stp_submitted_at?: string | null
}

export function useEmployees() {
  return useQuery({ queryKey: ["employees"], queryFn: () => api.get<Employee[]>("/employees") })
}

export function useCreateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => api.post<Employee>("/employees", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees"] }),
  })
}

export function usePayRuns() {
  return useQuery({ queryKey: ["pay-runs"], queryFn: () => api.get<PayRun[]>("/pay-runs") })
}

export function useProcessPayRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => api.post<PayRun>("/pay-runs", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pay-runs"] }),
  })
}
