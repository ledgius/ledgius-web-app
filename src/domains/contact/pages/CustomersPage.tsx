import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell, InlineCreatePanel } from "@/components/layout"
import { Button, InlineAlert } from "@/components/primitives"
import { MoneyValue } from "@/components/financial"
import { DataTable, type Column } from "@/shared/components/DataTable"
import { SearchFilter } from "@/shared/components/SearchFilter"
import { useCustomers, type ContactSummary } from "../hooks/useContacts"
import { useFeedback } from "@/components/feedback"
import { api } from "@/shared/lib/api"
import { useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"

const columns: Column<ContactSummary>[] = [
  { key: "meta_number", header: "Code", className: "font-mono w-36 whitespace-nowrap", render: (row: ContactSummary) => <span className="text-primary-600 hover:underline cursor-pointer">{row.meta_number}</span> },
  { key: "name", header: "Name" },
  { key: "legal_name", header: "Legal Name" },
  { key: "tax_id", header: "ABN", className: "font-mono" },
  {
    key: "credit_limit",
    header: "Credit Limit",
    className: "text-right",
    render: (row: ContactSummary) => <MoneyValue amount={row.credit_limit} currency={row.curr} size="sm" />,
  },
]

function InlineCustomerForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const feedback = useFeedback()
  const [name, setName] = useState("")
  const [legalName, setLegalName] = useState("")
  const [taxId, setTaxId] = useState("")
  const [curr, setCurr] = useState("AUD")
  const [terms, setTerms] = useState("30")
  const [creditLimit, setCreditLimit] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async () => {
    setError("")
    if (!name) { setError("Name is required"); return }
    setSubmitting(true)
    try {
      await api.post("/customers", {
        name,
        country_id: 15,
        legal_name: legalName || name,
        tax_id: taxId,
        entity_class: 2,
        meta_number: name.substring(0, 3).toUpperCase() + "-" + Date.now().toString().slice(-4),
        curr,
        credit_limit: parseFloat(creditLimit) || 0,
        terms: parseInt(terms) || 30,
      })
      qc.invalidateQueries({ queryKey: ["customers"] })
      feedback.success("Customer created")
      setName("")
      setLegalName("")
      setTaxId("")
      setCurr("AUD")
      setTerms("30")
      setCreditLimit("")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create customer"
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      {error && <InlineAlert variant="error" className="mb-3">{error}</InlineAlert>}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Acme Pty Ltd" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Legal Name</label>
          <input type="text" value={legalName} onChange={e => setLegalName(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Same as name if blank" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">ABN</label>
          <input type="text" value={taxId} onChange={e => setTaxId(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            placeholder="XX XXX XXX XXX" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
          <input type="text" value={curr} onChange={e => setCurr(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            maxLength={3} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Payment Terms (days)</label>
          <input type="number" value={terms} onChange={e => setTerms(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Credit Limit</label>
          <input type="number" step="0.01" value={creditLimit} onChange={e => setCreditLimit(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            placeholder="0.00" />
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <Button loading={submitting} onClick={handleSubmit} size="sm">Create Customer</Button>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  )
}

export function CustomersPage() {
  usePageHelp(pageHelpContent.customers)
  usePagePolicies(["contact"])
  const { data: customers, isLoading, error } = useCustomers()
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [createOpen, setCreateOpen] = useState(false)

  const filtered = useMemo(() => {
    if (!search || !customers) return customers ?? []
    const q = search.toLowerCase()
    return customers.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.meta_number?.toLowerCase().includes(q) ||
        c.tax_id?.toLowerCase().includes(q)
    )
  }, [customers, search])

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Customers</h1>
        <span className="text-sm text-gray-500">Accounts Receivable &middot; {filtered.length} contacts</span>
      </div>
      <p className="text-sm text-gray-500 mt-0.5">People and businesses who buy from you</p>
      <div className="flex items-center gap-3 mt-3">
        <Button onClick={() => setCreateOpen(!createOpen)} variant={createOpen ? "secondary" : "primary"}>
          <Plus className="h-4 w-4" />
          New Customer
        </Button>
        <div className="flex-1" />
        <div className="max-w-sm">
          <SearchFilter placeholder="Search customers..." onSearch={setSearch} />
        </div>
      </div>
    </div>
  )

  return (
    <PageShell header={header}>
      <InlineCreatePanel isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New Customer">
        <InlineCustomerForm onClose={() => setCreateOpen(false)} />
      </InlineCreatePanel>

      <DataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        error={error}
        emptyMessage="No customers. Click 'New Customer' to add your first customer."
        onRowClick={(row) => navigate(`/contacts/${row.id}`)}
      />
    </PageShell>
  )
}
