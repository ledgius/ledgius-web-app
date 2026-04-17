import { useQuery } from "@tanstack/react-query"
import { api } from "@/shared/lib/api"

export interface ContactSummary {
  id: number
  name: string
  control_code: string
  meta_number: string
  entity_class: number
  legal_name: string | null
  tax_id: string | null
  curr: string
  credit_limit: number
}

export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: () => api.get<ContactSummary[]>("/customers"),
  })
}

export interface ContactChannel {
  id: number
  contact_class: string
  value: string
  is_primary: boolean
  notes?: string
}

export interface ContactAddress {
  location: {
    id: number
    line_one: string
    line_two?: string
    city: string
    state?: string
    mail_code?: string
    country_id: number
  }
  location_class_id: number
  class_name: string
  is_primary: boolean
}

export interface ContactCreditAccount {
  id: number
  entity_id: number
  entity_class: number
  pay_to_name: string
  discount: number
  discount_terms: number
  tax_included: boolean
  credit_limit: number
  terms: number
  meta_number: string
  curr: string
  threshold: number
  status: string
  entity: {
    id: number
    name: string
    control_code: string
  }
  company: {
    legal_name: string
    tax_id: string
  } | null
}

export interface ContactDetail {
  credit_account: ContactCreditAccount
  channels: ContactChannel[]
  addresses: ContactAddress[]
}

export function useContactDetail(id: number) {
  return useQuery({
    queryKey: ["contacts", id, "detail"],
    queryFn: () => api.get<ContactDetail>(`/contacts/${id}/detail`),
    enabled: id > 0,
  })
}

export function useVendors() {
  return useQuery({
    queryKey: ["vendors"],
    queryFn: () => api.get<ContactSummary[]>("/vendors"),
  })
}
