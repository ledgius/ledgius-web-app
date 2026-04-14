import { useState, useCallback } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell, PageSection } from "@/components/layout"
import { Button, InlineAlert } from "@/components/primitives"
import { useEscapeKey } from "@/hooks/useEscapeKey"
import { api } from "@/shared/lib/api"
import { useQueryClient } from "@tanstack/react-query"
import { useFeedback } from "@/components/feedback"

export function CreateContactPage() {
  usePageHelp(pageHelpContent.createContact)
  usePagePolicies(["contact"])
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
