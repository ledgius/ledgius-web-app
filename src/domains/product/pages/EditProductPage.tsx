import { useState, useEffect, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell, PageSection } from "@/components/layout"
import { Button, InlineAlert } from "@/components/primitives"
import { useEscapeKey } from "@/hooks/useEscapeKey"
import { useProducts } from "../hooks/useProducts"
import { useTaxCodes } from "@/domains/taxcode/hooks/useTaxCodes"
import { useAccounts } from "@/domains/account/hooks/useAccounts"
import { api } from "@/shared/lib/api"
import { useQueryClient } from "@tanstack/react-query"
import { useFeedback } from "@/components/feedback"

export function EditProductPage() {
  usePagePolicies(["product", "account", "tax"])
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const handleCancel = useCallback(() => navigate("/products"), [navigate])
  useEscapeKey(handleCancel)
  const qc = useQueryClient()
  const feedback = useFeedback()
  const productId = parseInt(id ?? "0")
  const { data: products } = useProducts()
  const { data: taxCodes } = useTaxCodes()
  const { data: accounts } = useAccounts()
  const product = products?.find(p => p.id === productId)

  const [name, setName] = useState("")
  const [sellPrice, setSellPrice] = useState("")
  const [buyPrice, setBuyPrice] = useState("")
  const [unit, setUnit] = useState("")
  const [sellTaxCodeId, setSellTaxCodeId] = useState("")
  const [buyTaxCodeId, setBuyTaxCodeId] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  void accounts // Available for future account selector enhancement

  useEffect(() => {
    if (product) {
      setName(product.name)
      setSellPrice(product.sell_price)
      setBuyPrice(product.buy_price)
      setUnit(product.unit ?? "")
      setSellTaxCodeId(product.sell_tax_code_id ? String(product.sell_tax_code_id) : "")
      setBuyTaxCodeId(product.buy_tax_code_id ? String(product.buy_tax_code_id) : "")
    }
  }, [product])

  if (!product) return <p className="text-gray-500">Loading...</p>

  const handleSave = async () => {
    setSaving(true)
    setError("")
    try {
      await api.put(`/products/${productId}`, {
        name, sell_price: sellPrice, buy_price: buyPrice, unit: unit || undefined,
        sell_tax_code_id: sellTaxCodeId ? parseInt(sellTaxCodeId) : undefined,
        buy_tax_code_id: buyTaxCodeId ? parseInt(buyTaxCodeId) : undefined,
      })
      qc.invalidateQueries({ queryKey: ["products"] })
      feedback.success("Product saved")
      navigate("/products")
    } catch (err: any) {
      const message = err.message || "Failed to save product"
      feedback.error("Save failed", message)
    } finally {
      setSaving(false)
    }
  }

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Edit {product.name}</h1>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
        <Button loading={saving} onClick={handleSave}>Save</Button>
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
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
            <input type="text" value={unit} onChange={e => setUnit(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Sell Price</label>
              <input type="number" step="0.01" value={sellPrice} onChange={e => setSellPrice(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm font-mono" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Buy Price</label>
              <input type="number" step="0.01" value={buyPrice} onChange={e => setBuyPrice(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm font-mono" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Sell Tax Code</label>
              <select value={sellTaxCodeId} onChange={e => setSellTaxCodeId(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
                <option value="">None</option>
                {taxCodes?.map(tc => <option key={tc.id} value={tc.id}>{tc.code}</option>)}
              </select></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Buy Tax Code</label>
              <select value={buyTaxCodeId} onChange={e => setBuyTaxCodeId(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
                <option value="">None</option>
                {taxCodes?.map(tc => <option key={tc.id} value={tc.id}>{tc.code}</option>)}
              </select></div>
          </div>
        </div>
      </PageSection>
    </PageShell>
  )
}
