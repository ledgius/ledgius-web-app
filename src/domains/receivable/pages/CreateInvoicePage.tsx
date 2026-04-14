import { useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell, PageSection } from "@/components/layout"
import { Button, InlineAlert, Combobox } from "@/components/primitives"
import { useFeedback } from "@/components/feedback"
import { useEscapeKey } from "@/hooks/useEscapeKey"
import { useInvoices, useCreateInvoice } from "../hooks/useInvoices"
import { useCustomers } from "@/domains/contact/hooks/useContacts"
import { useAccounts } from "@/domains/account/hooks/useAccounts"
import { useTaxCodes } from "@/domains/taxcode/hooks/useTaxCodes"
import { formatCurrency } from "@/shared/lib/utils"

interface LineInput {
  description: string
  qty: string
  sellprice: string
  account_id: string
  tax_code_id: string
}

const emptyLine = (): LineInput => ({
  description: "", qty: "1", sellprice: "", account_id: "", tax_code_id: "",
})

export function CreateInvoicePage() {
  usePageHelp(pageHelpContent.createInvoice)
  usePagePolicies(["receivable", "tax"])
  const navigate = useNavigate()
  const feedback = useFeedback()
  const createInvoice = useCreateInvoice()
  const { data: allInvoices } = useInvoices()
  const { data: customers } = useCustomers()
  const { data: accounts } = useAccounts()
  const { data: taxCodes } = useTaxCodes()

  const nextInvNumber = `INV-${String((allInvoices?.length ?? 0) + 1).padStart(4, "0")}`
  const [customerID, setCustomerID] = useState("")
  const [invNumber, setInvNumber] = useState("")
  const displayInvNumber = invNumber || nextInvNumber
  const [transDate, setTransDate] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [curr] = useState("AUD")
  const [lines, setLines] = useState<LineInput[]>([emptyLine(), emptyLine()])
  const [error, setError] = useState("")

  const revenueAccounts = accounts?.filter(a => a.category === "I") ?? []
  const gstAccount = accounts?.find(a => a.accno === "2200")

  const updateLine = (idx: number, field: keyof LineInput, value: string) => {
    const updated = [...lines]
    updated[idx] = { ...updated[idx], [field]: value }
    setLines(updated)
  }

  const addLine = () => setLines([...lines, emptyLine()])
  const removeLine = (idx: number) => {
    if (lines.length > 1) setLines(lines.filter((_, i) => i !== idx))
  }

  const lineTotal = (line: LineInput) => {
    const qty = parseFloat(line.qty) || 0
    const price = parseFloat(line.sellprice) || 0
    return qty * price
  }

  const netTotal = lines.reduce((sum, l) => sum + lineTotal(l), 0)

  // Find GST rate from selected tax code (default 10%).
  const getGSTRate = (taxCodeId: string) => {
    if (!taxCodeId) return 0.1
    const tc = taxCodes?.find(c => c.id === parseInt(taxCodeId))
    return tc ? parseFloat(tc.rate) : 0.1
  }

  const gstTotal = lines.reduce((sum, l) => {
    if (!l.tax_code_id && !gstAccount) return sum
    return sum + lineTotal(l) * getGSTRate(l.tax_code_id)
  }, 0)

  const grossTotal = netTotal + gstTotal

  const handleSubmit = async () => {
    setError("")
    if (!customerID || !displayInvNumber || !transDate) {
      setError("Customer, invoice number, and date are required")
      return
    }

    const validLines = lines.filter(l => l.description && l.sellprice && l.account_id)
    if (validLines.length === 0) {
      setError("At least one line with description, price, and account is required")
      return
    }

    try {
      await createInvoice.mutateAsync({
        customer_id: parseInt(customerID),
        invnumber: displayInvNumber,
        transdate: transDate + "T00:00:00Z",
        duedate: dueDate ? dueDate + "T00:00:00Z" : undefined,
        curr,
        tax_included: false,
        lines: validLines.map(l => ({
          description: l.description,
          qty: parseFloat(l.qty) || 1,
          sellprice: parseFloat(l.sellprice) || 0,
          account_id: parseInt(l.account_id),
          tax_account_id: gstAccount?.id,
          tax_code_id: l.tax_code_id ? parseInt(l.tax_code_id) : undefined,
        })),
      })
      feedback.success("Invoice created")
      navigate("/invoices")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create invoice"
      feedback.error("Invoice creation failed", message)
    }
  }

  const handleCancel = useCallback(() => navigate("/invoices"), [navigate])
  useEscapeKey(handleCancel)

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Create Invoice</h1>
      </div>
      <p className="text-sm text-gray-500 mt-0.5">Bill a customer for goods or services</p>
      <div className="flex items-center gap-2 mt-3">
        <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
        <Button loading={createInvoice.isPending} onClick={handleSubmit}>
          Create Invoice
        </Button>
      </div>
    </div>
  )

  return (
    <PageShell header={header}>
      {error && <InlineAlert variant="error" className="mb-4">{error}</InlineAlert>}

      <PageSection title="Invoice Details">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Customer</label>
            <Combobox
              options={customers?.map(c => ({ value: c.id, label: c.name, detail: c.meta_number })) ?? []}
              value={customerID || null}
              onChange={(v) => setCustomerID(v ? String(v) : "")}
              placeholder="Search customers..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Invoice #
              <span className="ml-1 font-normal text-gray-400">auto-generated</span>
            </label>
            <input type="text" value={displayInvNumber} onChange={e => setInvNumber(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm font-mono" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <input type="date" value={transDate} onChange={e => setTransDate(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm" />
          </div>
        </div>
      </PageSection>

      <PageSection title="Line Items">
        <table className="w-full border rounded-lg text-sm mb-4">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Description</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600 w-20">Qty</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600 w-28">Price</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600 w-40">Revenue Account</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600 w-28">Tax Code</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600 w-28">Total</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {lines.map((line, idx) => (
              <tr key={idx}>
                <td className="px-3 py-2">
                  <input type="text" value={line.description} onChange={e => updateLine(idx, "description", e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm" placeholder="Item description" />
                </td>
                <td className="px-3 py-2">
                  <input type="number" value={line.qty} onChange={e => updateLine(idx, "qty", e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm text-right" min="1" />
                </td>
                <td className="px-3 py-2">
                  <input type="number" step="0.01" value={line.sellprice} onChange={e => updateLine(idx, "sellprice", e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm text-right font-mono" placeholder="0.00" />
                </td>
                <td className="px-3 py-2">
                  <select value={line.account_id} onChange={e => updateLine(idx, "account_id", e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm">
                    <option value="">Account...</option>
                    {revenueAccounts.map(a => (
                      <option key={a.id} value={a.id}>{a.accno} — {a.description}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select value={line.tax_code_id} onChange={e => updateLine(idx, "tax_code_id", e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm">
                    <option value="">GST (10%)</option>
                    {taxCodes?.map(tc => (
                      <option key={tc.id} value={tc.id}>{tc.code} ({(parseFloat(tc.rate) * 100).toFixed(0)}%)</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2 text-right font-mono bg-gray-100 text-gray-500">{formatCurrency(lineTotal(line))}</td>
                <td className="px-3 py-2">
                  {lines.length > 1 && (
                    <button onClick={() => removeLine(idx)} className="text-red-400 hover:text-red-600 text-xs">X</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100">
              <td colSpan={5} className="px-3 py-2 text-right font-medium text-gray-600">Subtotal (ex GST)</td>
              <td className="px-3 py-2 text-right font-mono text-gray-600">{formatCurrency(netTotal)}</td>
              <td></td>
            </tr>
            <tr className="bg-gray-100">
              <td colSpan={5} className="px-3 py-2 text-right font-medium text-gray-600">GST</td>
              <td className="px-3 py-2 text-right font-mono text-gray-600">{formatCurrency(gstTotal)}</td>
              <td></td>
            </tr>
            <tr className="bg-gray-500 text-white">
              <td colSpan={5} className="px-3 py-2 text-right font-semibold">Total (inc GST)</td>
              <td className="px-3 py-2 text-right font-mono font-semibold">{formatCurrency(grossTotal)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        <Button variant="muted" size="sm" onClick={addLine} className="mb-4">
          + Add Line
        </Button>

      </PageSection>
    </PageShell>
  )
}
