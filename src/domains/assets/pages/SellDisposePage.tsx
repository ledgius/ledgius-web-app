// Spec references: R-0062.
import { useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell, PageSection } from "@/components/layout"
import { Button, InlineAlert } from "@/components/primitives"
import { MoneyValue } from "@/components/financial"
import { useEscapeKey } from "@/hooks/useEscapeKey"
import { useFeedback } from "@/components/feedback"

export function SellDisposePage() {
  usePagePolicies(["account", "tax", "assets"])
  const navigate = useNavigate()
  const handleCancel = useCallback(() => navigate("/assets"), [navigate])
  useEscapeKey(handleCancel)
  const feedback = useFeedback()

  const [assetId, setAssetId] = useState("")
  const [disposalDate, setDisposalDate] = useState("")
  const [salePrice, setSalePrice] = useState("")
  const [buyer, setBuyer] = useState("")
  const [reason, setReason] = useState("")
  const [error, setError] = useState("")

  // Simulated book value for the selected asset (will come from API)
  const selectedBookValue = assetId ? 0 : null
  const salePriceNum = parseFloat(salePrice) || 0
  const gainLoss = selectedBookValue !== null ? salePriceNum - selectedBookValue : null

  const handleSubmit = async () => {
    setError("")
    if (!assetId || !disposalDate || !reason) {
      setError("Asset, disposal date, and reason are required")
      return
    }
    // API not built yet
    feedback.info("Coming soon — asset disposal will be available once the API is ready")
  }

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Sell / Dispose Asset</h1>
      </div>
      <p className="text-sm text-gray-500 mt-0.5">Record the sale or disposal of a fixed asset</p>
      <div className="flex items-center gap-2 mt-3">
        <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
        <Button onClick={handleSubmit}>
          Record Disposal
        </Button>
      </div>
    </div>
  )

  return (
    <PageShell header={header}>
      {error && <InlineAlert variant="error" className="mb-4">{error}</InlineAlert>}

      <PageSection title="Disposal Details">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Select Asset</label>
            <select
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 pr-7 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Select an asset from the register...</option>
              {/* Options populated from API when available */}
            </select>
            {assetId === "" && (
              <p className="text-xs text-gray-400 mt-1">No assets in register. Add assets first.</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Disposal Date</label>
            <input
              type="date"
              value={disposalDate}
              onChange={(e) => setDisposalDate(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Sale Price</label>
            <input
              type="number"
              step="0.01"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              placeholder="0.00 (enter 0 if scrapped)"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 pr-7 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Select reason...</option>
              <option value="sold">Sold</option>
              <option value="scrapped">Scrapped</option>
              <option value="donated">Donated</option>
              <option value="traded_in">Traded In</option>
            </select>
          </div>
        </div>
      </PageSection>

      <PageSection title="Buyer (Optional)">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Buyer (Contact)</label>
            <input
              type="text"
              value={buyer}
              onChange={(e) => setBuyer(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Search contacts..."
            />
          </div>
        </div>
      </PageSection>

      {/* Gain/Loss calculation panel */}
      {assetId && (
        <PageSection title="Calculated Gain / Loss on Disposal">
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
            <div className="grid grid-cols-3 gap-6 text-sm">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Current Book Value</p>
                <p className="font-medium text-gray-900">
                  <MoneyValue amount={selectedBookValue ?? 0} currency="AUD" />
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Sale Proceeds</p>
                <p className="font-medium text-gray-900">
                  <MoneyValue amount={salePriceNum} currency="AUD" />
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  {gainLoss !== null && gainLoss >= 0 ? "Gain on Disposal" : "Loss on Disposal"}
                </p>
                <p className={`font-semibold ${gainLoss !== null && gainLoss >= 0 ? "text-green-700" : "text-red-700"}`}>
                  <MoneyValue amount={Math.abs(gainLoss ?? 0)} currency="AUD" />
                </p>
              </div>
            </div>
          </div>
        </PageSection>
      )}
    </PageShell>
  )
}
