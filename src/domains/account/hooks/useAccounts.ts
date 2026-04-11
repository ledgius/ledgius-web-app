import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/shared/lib/api"

export interface Account {
  id: number
  accno: string
  description: string | null
  is_temp: boolean
  category: string
  heading: number
  contra: boolean
  tax: boolean
  obsolete: boolean
  open_item_managed: boolean
  has_activity: boolean
  links: { account_id: number; description: string }[]
}

export interface AccountHeading {
  id: number
  accno: string
  description: string | null
  category: string | null
  parent_id: number | null
}

export function useAccounts() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: () => api.get<Account[]>("/accounts"),
  })
}

export function useAccountHeadings() {
  return useQuery({
    queryKey: ["account-headings"],
    queryFn: () => api.get<AccountHeading[]>("/headings"),
  })
}

export function useAccount(id: number) {
  return useQuery({
    queryKey: ["accounts", id],
    queryFn: () => api.get<Account>(`/accounts/${id}`),
    enabled: id > 0,
  })
}

export function useDeleteAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/accounts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
  })
}

export function useCreateHeading() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { accno: string; description: string; category?: string; parent_id?: number }) =>
      api.post<AccountHeading>("/headings", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["account-headings"] }),
  })
}

export function useCreateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      accno: string
      description: string
      category: string
      heading_id: number
      contra?: boolean
      tax?: boolean
      links?: string[]
    }) => api.post<Account>("/accounts", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
  })
}
