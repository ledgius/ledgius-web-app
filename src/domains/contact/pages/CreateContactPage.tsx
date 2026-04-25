import { useState, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell, PageSection } from "@/components/layout"
import { Button, InlineAlert } from "@/components/primitives"
import { useEscapeKey } from "@/hooks/useEscapeKey"
import { api } from "@/shared/lib/api"
import { useQueryClient } from "@tanstack/react-query"
import { useFeedback } from "@/components/feedback"

export function CreateContactPage() {
  usePagePolicies(["contact", "receivable", "payable"])
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const type = searchParams.get("type") === "vendor" ? "vendor" : "customer"
  const backPath = type === "vendor" ? "/vendors" : "/customers"
  const handleCancel = useCallback(() => navigate(backPath), [navigate, backPath])
  useEscapeKey(handleCancel)
  const qc = useQueryClient()
  const feedback = useFeedback()

  const [name, setName] = useState("")
  const [legalName, setLegalName] = useState("")
  const [taxId, setTaxId] = useState("")
  const [curr, setCurr] = useState("AUD")
  const [creditLimit, setCreditLimit] = useState("")
  const [terms, setTerms] = useState("30")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [addrLine1, setAddrLine1] = useState("")
  const [addrCity, setAddrCity] = useState("")
  const [addrState, setAddrState] = useState("")
  const [addrPostcode, setAddrPostcode] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    setError("")
    if (!name) { setError("Name is required"); return }
    setSubmitting(true)
    try {
      const endpoint = type === "vendor" ? "/vendors" : "/customers"
      await api.post(endpoint, {
        name,
        country_id: 15,            // Australia (AU) — TODO: make selectable
        legal_name: legalName || name,
        tax_id: taxId,
        entity_class: type === "vendor" ? 1 : 2,
        meta_number: name.substring(0, 3).toUpperCase() + "-" + Date.now().toString().slice(-4),
        curr,
        credit_limit: parseFloat(creditLimit) || 0,
        terms: parseInt(terms) || 30,
        email: email || undefined,
        phones: phone ? [{ class: "phone_office", value: phone }] : undefined,
        postal_address: addrLine1 ? {
          line_one: addrLine1,
          city: addrCity,
          state: addrState || undefined,
          country_id: 15,
          mail_code: addrPostcode || undefined,
        } : undefined,
      })
      qc.invalidateQueries({ queryKey: [type === "vendor" ? "vendors" : "customers"] })
      feedback.success("Contact created")
      navigate(backPath)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create contact"
      feedback.error("Contact creation failed", message)
    } finally {
      setSubmitting(false)
    }
  }

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Create {type === "vendor" ? "Vendor" : "Customer"}</h1>
      </div>
      <p className="text-sm text-gray-500 mt-0.5">Add a new customer or supplier</p>
      <div className="flex items-center gap-2 mt-3">
        <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
        <Button loading={submitting} onClick={handleSubmit}>
          Create {type === "vendor" ? "Vendor" : "Customer"}
        </Button>
      </div>
    </div>
  )

  return (
    <PageShell header={header}>
      {error && <InlineAlert variant="error" className="mb-4">{error}</InlineAlert>}
      <PageSection title="Contact Details">
        <div className="space-y-4">
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Legal Name</label>
            <input type="text" value={legalName} onChange={e => setLegalName(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">ABN</label>
            <input type="text" value={taxId} onChange={e => setTaxId(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" placeholder="XX XXX XXX XXX" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" placeholder="billing@example.com" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" placeholder="02 9000 0000" /></div>
          </div>
        </div>
      </PageSection>
        <PageSection title="Billing Address">
          <div className="space-y-4">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Street Address</label>
              <input type="text" value={addrLine1} onChange={e => setAddrLine1(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className="block text-xs font-medium text-gray-600 mb-1">City / Suburb</label>
                <input type="text" value={addrCity} onChange={e => setAddrCity(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">State</label>
                <input type="text" value={addrState} onChange={e => setAddrState(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" placeholder="NSW" maxLength={3} /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Postcode</label>
                <input type="text" value={addrPostcode} onChange={e => setAddrPostcode(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" placeholder="2000" maxLength={4} /></div>
            </div>
          </div>
        </PageSection>
        <PageSection title="Account Settings">
          <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
              <input type="text" value={curr} onChange={e => setCurr(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" maxLength={3} /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Payment Terms (days)</label>
              <input type="number" value={terms} onChange={e => setTerms(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
          </div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Credit Limit</label>
            <input type="number" step="0.01" value={creditLimit} onChange={e => setCreditLimit(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm font-mono" placeholder="0.00" /></div>
        </div>
      </PageSection>
    </PageShell>
  )
}
