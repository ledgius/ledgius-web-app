import { useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell, PageSection } from "@/components/layout"
import { Button, InlineAlert, Combobox } from "@/components/primitives"
import { useEscapeKey } from "@/hooks/useEscapeKey"
import { useBills, useCreateBill } from "../hooks/useBills"
import { useVendors } from "@/domains/contact/hooks/useContacts"
import { useAccounts } from "@/domains/account/hooks/useAccounts"
import { useTaxCodes } from "@/domains/taxcode/hooks/useTaxCodes"
import { formatCurrency } from "@/shared/lib/utils"
import { useFeedback } from "@/components/feedback"

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

export function CreateBillPage() {
  usePagePolicies(["payable", "account", "tax"])
  const navigate = useNavigate()
  const handleCancel = useCallback(() => navigate("/bills"), [navigate])
  useEscapeKey(handleCancel)
  const createBill = useCreateBill()
  const { data: allBills } = useBills()
  const { data: vendors } = useVendors()
  const { data: accounts } = useAccounts()
  const { data: taxCodes } = useTaxCodes()
  const feedback = useFeedback()

  const nextBillNumber = `BILL-${String((allBills?.length ?? 0) + 1).padStart(4, "0")}`
  const [vendorID, setVendorID] = useState("")
  const [invNumber, setInvNumber] = useState("")
  const displayInvNumber = invNumber || nextBillNumber
  const [transDate, setTransDate] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [curr] = useState("AUD")
  const [lines, setLines] = useState<LineInput[]>([emptyLine()])
  const [error, setError] = useState("")

  const expenseAccounts = accounts?.filter(a => a.category === "E") ?? []
  const gstPaidAccount = accounts?.find(a => a.accno === "1200")

  const updateLine = (idx: number, field: keyof LineInput, value: string) => {
    const updated = [...lines]
    updated[idx] = { ...updated[idx], [field]: value }
    setLines(updated)
  }

  const addLine = () => setLines([...lines, emptyLine()])
  const removeLine = (idx: number) => {
    if (lines.length > 1) setLines(lines.filter((_, i) => i !== idx))
  }

  const lineTotal = (line: LineInput) => (parseFloat(line.qty) || 0) * (parseFloat(line.sellprice) || 0)

  const getGSTRate = (taxCodeId: string) => {
    if (!taxCodeId) return 0.1
    const tc = taxCodes?.find(c => c.id === parseInt(taxCodeId))
    return tc ? parseFloat(tc.rate) : 0.1
  }

  const netTotal = lines.reduce((sum, l) => sum + lineTotal(l), 0)
  const gstTotal = lines.reduce((sum, l) => sum + lineTotal(l) * getGSTRate(l.tax_code_id), 0)
  const grossTotal = netTotal + gstTotal

  const handleSubmit = async () => {
    setError("")
    if (!vendorID || !displayInvNumber || !transDate) {
      setError("Vendor, bill number, and date are required")
      return
    }

    const validLines = lines.filter(l => l.description && l.sellprice && l.account_id)
    if (validLines.length === 0) {
      setError("At least one line is required")
      return
    }

    try {
      await createBill.mutateAsync({
        vendor_id: parseInt(vendorID),
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
          tax_account_id: gstPaidAccount?.id,
          tax_code_id: l.tax_code_id ? parseInt(l.tax_code_id) : undefined,
        })),
      })
      feedback.success("Bill created")
      navigate("/bills")
    } catch (err: any) {
      const message = err.message || "Failed to create bill"
      feedback.error("Bill creation failed", message)
    }
  }

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Create Bill</h1>
      </div>
      <p className="text-sm text-gray-500 mt-0.5">Record a supplier invoice you need to pay</p>
      <div className="flex items-center gap-2 mt-3">
        <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
        <Button loading={createBill.isPending} onClick={handleSubmit}>
          Create Bill
        </Button>
      </div>
    </div>
  )

  return (
    <PageShell header={header}>
      {error && <InlineAlert variant="error" className="mb-4">{error}</InlineAlert>}

      <PageSection title="Bill Details">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Vendor</label>
            <Combobox
              options={vendors?.map(v => ({ value: v.id, label: v.name, detail: v.meta_number })) ?? []}
              value={vendorID || null}
              onChange={(v) => setVendorID(v ? String(v) : "")}
              placeholder="Search vendors..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Bill #
              <span className="ml-1 font-normal text-gray-400">auto-generated</span>
            </label>
            <input type="text" value={displayInvNumber} onChange={e => setInvNumber(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm font-mono" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <input type="date" value={transDate} onChange={e => setTransDate(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
          </div>
        </div>
      </PageSection>

      <PageSection title="Line Items">
        <table className="w-full border rounded-lg text-sm mb-4">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Description</th>
              <th className="text-center px-3 py-2 font-medium text-gray-600 w-20">Qty</th>
              <th className="text-center px-3 py-2 font-medium text-gray-600 w-[142px]">Price</th>
              <th className="text-center px-3 py-2 font-medium text-gray-600 w-40">Expense Account</th>
              <th className="text-center px-3 py-2 font-medium text-gray-600 w-[127px]">Tax Code</th>
              <th className="text-right px-3 py-2 font-medium text-gray-600 w-28">Total</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {lines.map((line, idx) => (
              <tr key={idx}>
                <td className="px-3 py-2"><input type="text" value={line.description} onChange={e => updateLine(idx, "description", e.target.value)} className="w-full border rounded px-2 py-1 text-sm" /></td>
                <td className="px-3 py-2"><input type="number" value={line.qty} onChange={e => updateLine(idx, "qty", e.target.value)} className="w-full border rounded px-2 py-1 text-sm text-right" min="1" /></td>
                <td className="px-3 py-2"><input type="number" step="0.01" value={line.sellprice} onChange={e => updateLine(idx, "sellprice", e.target.value)} className="w-full border rounded px-2 py-1 text-sm text-right font-mono" placeholder="0.00" /></td>
                <td className="px-3 py-2">
                  <select value={line.account_id} onChange={e => updateLine(idx, "account_id", e.target.value)} className="w-full border rounded pl-2 pr-7 py-1 text-sm">
                    <option value="">Account...</option>
                    {expenseAccounts.map(a => <option key={a.id} value={a.id}>{a.accno} — {a.description}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select value={line.tax_code_id} onChange={e => updateLine(idx, "tax_code_id", e.target.value)} className="w-full border rounded pl-2 pr-7 py-1 text-sm">
                    <option value="">GST (10%)</option>
                    {taxCodes?.map(tc => <option key={tc.id} value={tc.id}>{tc.code} ({(parseFloat(tc.rate) * 100).toFixed(0)}%)</option>)}
                  </select>
                </td>
                <td className="px-3 py-2 text-right font-mono bg-gray-100 text-gray-500">{formatCurrency(lineTotal(line))}</td>
                <td className="px-3 py-2">{lines.length > 1 && <button onClick={() => removeLine(idx)} className="text-red-400 hover:text-red-600 text-xs">X</button>}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} className="px-3 py-1.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Subtotal (ex GST)</td>
              <td className="px-3 py-1.5 text-right font-mono text-sm text-gray-700 tabular-nums">{formatCurrency(netTotal)}</td>
              <td></td>
            </tr>
            <tr>
              <td colSpan={5} className="px-3 py-1.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">GST</td>
              <td className="px-3 py-1.5 text-right font-mono text-sm text-gray-700 tabular-nums">{formatCurrency(gstTotal)}</td>
              <td></td>
            </tr>
            <tr className="border-t-2 border-gray-300">
              <td colSpan={5} className="px-3 pt-2.5 pb-3 text-right text-sm font-semibold text-gray-600">Total (inc GST)</td>
              <td className="px-3 pt-2.5 pb-3 text-right font-mono text-base font-bold text-gray-600 tabular-nums">{formatCurrency(grossTotal)}</td>
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
