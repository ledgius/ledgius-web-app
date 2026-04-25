import { useState, useEffect, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell, PageSection } from "@/components/layout"
import { EntityHeader, AuditTimeline } from "@/components/workflow"
import { Button, InlineAlert, Skeleton } from "@/components/primitives"
import { useFeedback } from "@/components/feedback"
import { useEscapeKey } from "@/hooks/useEscapeKey"
import { useContactDetail } from "../hooks/useContacts"
import { useEntityActivity } from "@/hooks/useEntityActivity"
import { api } from "@/shared/lib/api"
import { useQueryClient } from "@tanstack/react-query"
import { Mail, Phone, MapPin } from "lucide-react"

const CHANNEL_LABELS: Record<string, string> = {
  email: "Email",
  phone_office: "Office Phone",
  phone_mobile: "Mobile",
  phone_fax: "Fax",
  phone_other: "Other Phone",
  website: "Website",
}

export function ContactDetailPage() {
  usePagePolicies(["contact", "receivable", "payable"])
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const feedback = useFeedback()
  const qc = useQueryClient()
  const contactId = parseInt(id ?? "0")
  const { data: detail, isLoading, error: loadError } = useContactDetail(contactId)
  const { data: activity, isLoading: activityLoading } = useEntityActivity("contacts", contactId)

  const contact = detail?.credit_account
  const channels = detail?.channels ?? []
  const addresses = detail?.addresses ?? []

  const [creditLimit, setCreditLimit] = useState("")
  const [terms, setTerms] = useState("")
  const [discount, setDiscount] = useState("")
  const [discountTerms, setDiscountTerms] = useState("")
  const [saving, setSaving] = useState(false)
  const [initialised, setInitialised] = useState(false)

  useEffect(() => {
    if (contact && !initialised) {
      setCreditLimit(String(contact.credit_limit ?? 0))
      setTerms(String(contact.terms ?? 30))
      setDiscount(String(contact.discount ?? 0))
      setDiscountTerms(String(contact.discount_terms ?? 0))
      setInitialised(true)
    }
  }, [contact, initialised])

  const isCustomer = contact?.entity_class === 2
  const typeLabel = isCustomer ? "Customer" : "Vendor"
  const backPath = isCustomer ? "/customers" : "/vendors"

  const handleCancel = useCallback(() => navigate(backPath), [navigate, backPath])
  useEscapeKey(handleCancel)

  const isDirty = initialised && contact ? (
    creditLimit !== String(contact.credit_limit ?? 0) ||
    terms !== String(contact.terms ?? 30) ||
    discount !== String(contact.discount ?? 0) ||
    discountTerms !== String(contact.discount_terms ?? 0)
  ) : false

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put(`/contacts/${contactId}`, {
        credit_limit: parseFloat(creditLimit) || 0,
        terms: parseInt(terms) || 30,
        discount: parseFloat(discount) || 0,
        discount_terms: parseInt(discountTerms) || 0,
      })
      qc.invalidateQueries({ queryKey: ["contacts", contactId, "detail"] })
      setInitialised(false)
      feedback.success("Contact saved")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save"
      feedback.error("Save failed", message)
    } finally {
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    if (contact) {
      setCreditLimit(String(contact.credit_limit ?? 0))
      setTerms(String(contact.terms ?? 30))
      setDiscount(String(contact.discount ?? 0))
      setDiscountTerms(String(contact.discount_terms ?? 0))
    }
  }

  if (isLoading) return <Skeleton variant="table" rows={4} columns={2} className="mt-8" />
  if (loadError || !contact) {
    return (
      <PageShell>
        <InlineAlert variant="error">Contact not found.</InlineAlert>
      </PageShell>
    )
  }

  const contactStatus = contact.status || "active"

  const handleStatusChange = async (newStatus: string) => {
    try {
      await api.patch(`/contacts/${contactId}/status`, { status: newStatus })
      qc.invalidateQueries({ queryKey: ["contacts", contactId, "detail"] })
      feedback.success(`Contact ${newStatus === "active" ? "activated" : newStatus === "on_hold" ? "put on hold" : "archived"}`)
    } catch (err: unknown) {
      feedback.error("Status change failed", err instanceof Error ? err.message : "")
    }
  }

  const primaryEmail = channels.find(c => c.contact_class === "email" && c.is_primary)
  const phones = channels.filter(c => c.contact_class.startsWith("phone_"))
  const billingAddr = addresses.find(a => a.class_name === "billing" && a.is_primary)
  const shippingAddr = addresses.find(a => a.class_name === "shipping" && a.is_primary)

  const header = (
    <div>
      <EntityHeader
        title={contact.entity?.name ?? `Contact ${contactId}`}
        subtitle={typeLabel}
        status={contactStatus}
        reference={contact.meta_number}
        backTo={backPath}
      />
      <div className="flex items-center gap-2 mt-3">
        <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
        <Button disabled={!isDirty} loading={saving} onClick={handleSave}>Save</Button>
        <Button variant="secondary" disabled={!isDirty} onClick={handleDiscard}>Discard Changes</Button>
        <div className="flex-1" />
        {contactStatus === "active" && (
          <Button variant="danger" size="sm" onClick={() => handleStatusChange("on_hold")}>Put On Hold</Button>
        )}
        {contactStatus === "on_hold" && (
          <>
            <Button size="sm" onClick={() => handleStatusChange("active")}>Reactivate</Button>
            <Button variant="danger" size="sm" onClick={() => handleStatusChange("archived")}>Archive</Button>
          </>
        )}
        {contactStatus === "archived" && (
          <Button size="sm" onClick={() => handleStatusChange("active")}>Reactivate</Button>
        )}
      </div>
    </div>
  )

  return (
    <PageShell header={header}>
      <PageSection title="Entity Details">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-gray-500 text-right">Name</dt><dd className="font-medium">{contact.entity?.name}</dd>
          <dt className="text-gray-500 text-right">Control Code</dt><dd className="font-mono">{contact.entity?.control_code}</dd>
          <dt className="text-gray-500 text-right">Account #</dt><dd className="font-mono">{contact.meta_number}</dd>
          {contact.company && (
            <>
              <dt className="text-gray-500 text-right">Legal Name</dt><dd>{contact.company.legal_name}</dd>
              {contact.company.tax_id && (
                <><dt className="text-gray-500 text-right">ABN</dt><dd className="font-mono">{contact.company.tax_id}</dd></>
              )}
            </>
          )}
        </dl>
      </PageSection>

      {(channels.length > 0 || addresses.length > 0) && (
        <PageSection title="Contact Information">
          <div className="space-y-3 text-sm">
            {primaryEmail && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <a href={`mailto:${primaryEmail.value}`} className="text-primary-600 hover:underline">{primaryEmail.value}</a>
              </div>
            )}
            {phones.map(p => (
              <div key={p.id} className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{p.value}</span>
                <span className="text-xs text-gray-400">({CHANNEL_LABELS[p.contact_class] ?? p.contact_class})</span>
              </div>
            ))}
            {billingAddr && (
              <div className="flex items-start gap-2 mt-2">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-0.5">Billing Address</p>
                  <p>{billingAddr.location.line_one}</p>
                  {billingAddr.location.line_two && <p>{billingAddr.location.line_two}</p>}
                  <p>{[billingAddr.location.city, billingAddr.location.state, billingAddr.location.mail_code].filter(Boolean).join(" ")}</p>
                </div>
              </div>
            )}
            {shippingAddr && (
              <div className="flex items-start gap-2 mt-2">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-0.5">Shipping Address</p>
                  <p>{shippingAddr.location.line_one}</p>
                  {shippingAddr.location.line_two && <p>{shippingAddr.location.line_two}</p>}
                  <p>{[shippingAddr.location.city, shippingAddr.location.state, shippingAddr.location.mail_code].filter(Boolean).join(" ")}</p>
                </div>
              </div>
            )}
            {channels.length === 0 && addresses.length === 0 && (
              <p className="text-gray-400">No contact channels or addresses recorded</p>
            )}
          </div>
        </PageSection>
      )}

      <PageSection title="Credit Account">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
              <input type="text" value={contact.curr} disabled className="w-full border rounded px-2 py-1.5 text-sm bg-gray-100 text-gray-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Credit Limit</label>
              <input type="number" step="0.01" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm font-mono" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Payment Terms (days)</label>
              <input type="number" value={terms} onChange={(e) => setTerms(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tax Included</label>
              <input type="text" value={contact.tax_included ? "Yes" : "No"} disabled className="w-full border rounded px-2 py-1.5 text-sm bg-gray-100 text-gray-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Discount %</label>
              <input type="number" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Within (days)</label>
              <input type="number" value={discountTerms} onChange={(e) => setDiscountTerms(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm" />
            </div>
          </div>
        </div>
      </PageSection>

      <PageSection title="Activity">
        <AuditTimeline events={activity ?? []} loading={activityLoading} />
      </PageSection>
    </PageShell>
  )
}
