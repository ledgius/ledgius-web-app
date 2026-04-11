import { useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell, PageSection } from "@/components/layout"
import { Button, InlineAlert } from "@/components/primitives"
import { useEscapeKey } from "@/hooks/useEscapeKey"
import { useCreateProduct } from "../hooks/useProducts"
import { useTaxCodes } from "@/domains/taxcode/hooks/useTaxCodes"
import { useAccounts } from "@/domains/account/hooks/useAccounts"
import { useFeedback } from "@/components/feedback"

export function CreateProductPage() {
  usePageHelp(pageHelpContent.createProduct)
  usePagePolicies(["product"])
  const navigate = useNavigate()
  const handleCancel = useCallback(() => navigate("/products"), [navigate])
  useEscapeKey(handleCancel)
  const createProduct = useCreateProduct()
  const { data: taxCodes } = useTaxCodes()
  const { data: accounts } = useAccounts()
  const feedback = useFeedback()

  const [name, setName] = useState("")
  const [sku, setSku] = useState("")
  const [productType, setProductType] = useState("service")
  const [unit, setUnit] = useState("")
  const [sellPrice, setSellPrice] = useState("")
  const [buyPrice, setBuyPrice] = useState("")
  const [sellTaxCodeId, setSellTaxCodeId] = useState("")
  const [buyTaxCodeId, setBuyTaxCodeId] = useState("")
  const [incomeAccountId, setIncomeAccountId] = useState("")
  const [expenseAccountId, setExpenseAccountId] = useState("")
  const [error, setError] = useState("")

  const incomeAccounts = accounts?.filter(a => a.category === "I") ?? []
  const expenseAccounts = accounts?.filter(a => a.category === "E") ?? []

  const handleSubmit = async () => {
    setError("")
    if (!name) { setError("Name is required"); return }
    try {
      await createProduct.mutateAsync({
        name, sku: sku || undefined, product_type: productType, unit: unit || undefined,
        sell_price: sellPrice || "0", buy_price: buyPrice || "0",
        sell_tax_code_id: sellTaxCodeId ? parseInt(sellTaxCodeId) : undefined,
        buy_tax_code_id: buyTaxCodeId ? parseInt(buyTaxCodeId) : undefined,
        income_account_id: incomeAccountId ? parseInt(incomeAccountId) : undefined,
        expense_account_id: expenseAccountId ? parseInt(expenseAccountId) : undefined,
      } as any)
      feedback.success("Product created")
      navigate("/products")
    } catch (err: any) {
      const message = err.message || "Failed to create product"
      feedback.error("Product creation failed", message)
    }
  }

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Create Product / Service</h1>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
        <Button loading={createProduct.isPending} onClick={handleSubmit}>Create</Button>
      </div>
    </div>
  )

  return (
    <PageShell header={header}>
      {error && <InlineAlert variant="error" className="mb-4">{error}</InlineAlert>}
      <PageSection title="Product Details">
        <div className="space-y-4">
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">SKU</label>
              <input type="text" value={sku} onChange={e => setSku(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm font-mono" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select value={productType} onChange={e => setProductType(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
                <option value="service">Service</option><option value="product">Product</option><option value="overhead">Overhead</option>
              </select></div>
          </div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
            <input type="text" value={unit} onChange={e => setUnit(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" placeholder="hour, each, kg..." /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Sell Price</label>
              <input type="number" step="0.01" value={sellPrice} onChange={e => setSellPrice(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm font-mono" placeholder="0.00" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Buy Price</label>
              <input type="number" step="0.01" value={buyPrice} onChange={e => setBuyPrice(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm font-mono" placeholder="0.00" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Sell Tax Code</label>
              <select value={sellTaxCodeId} onChange={e => setSellTaxCodeId(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
                <option value="">None</option>
                {taxCodes?.map(tc => <option key={tc.id} value={tc.id}>{tc.code} ({(parseFloat(tc.rate)*100).toFixed(0)}%)</option>)}
              </select></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Buy Tax Code</label>
              <select value={buyTaxCodeId} onChange={e => setBuyTaxCodeId(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
                <option value="">None</option>
                {taxCodes?.map(tc => <option key={tc.id} value={tc.id}>{tc.code} ({(parseFloat(tc.rate)*100).toFixed(0)}%)</option>)}
              </select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Income Account</label>
              <select value={incomeAccountId} onChange={e => setIncomeAccountId(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
                <option value="">None</option>
                {incomeAccounts.map(a => <option key={a.id} value={a.id}>{a.accno} — {a.description}</option>)}
              </select></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Expense Account</label>
              <select value={expenseAccountId} onChange={e => setExpenseAccountId(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
                <option value="">None</option>
                {expenseAccounts.map(a => <option key={a.id} value={a.id}>{a.accno} — {a.description}</option>)}
              </select></div>
          </div>
        </div>
      </PageSection>
    </PageShell>
  )
}
