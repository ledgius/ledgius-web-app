import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/shared/lib/api"

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
  status: string; total_gross: string; total_tax: string; total_super: string; total_net: string
  employee_count: number
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
