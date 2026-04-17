import { useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell, PageSection } from "@/components/layout"
import { Button, InfoPanel, InlineAlert } from "@/components/primitives"
import { useEscapeKey } from "@/hooks/useEscapeKey"
import { useFeedback } from "@/components/feedback"

export function BuyAssetPage() {
  usePageHelp(pageHelpContent.buyAsset)
  usePagePolicies(["account", "tax"])
  const navigate = useNavigate()
  const handleCancel = useCallback(() => navigate("/assets"), [navigate])
  useEscapeKey(handleCancel)
  const feedback = useFeedback()

  const [assetName, setAssetName] = useState("")
  const [category, setCategory] = useState("")
  const [purchaseDate, setPurchaseDate] = useState("")
  const [purchasePrice, setPurchasePrice] = useState("")
  const [supplier, setSupplier] = useState("")
  const [glAccount, setGlAccount] = useState("")
  const [depreciationMethod, setDepreciationMethod] = useState("")
  const [usefulLife, setUsefulLife] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState("")

  const handleCreate = async () => {
    setError("")
    if (!assetName || !category || !purchaseDate || !purchasePrice || !depreciationMethod) {
      setError("Asset name, category, purchase date, purchase price, and depreciation method are required")
      return
    }
    // API not built yet — show coming soon feedback
    feedback.info("Coming soon", "Asset creation will be available once the API is ready")
  }

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Buy Asset</h1>
      </div>
      <p className="text-sm text-gray-500 mt-0.5">Record a new asset purchase</p>
      <div className="flex items-center gap-2 mt-3">
        <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
        <Button onClick={handleCreate}>
          Record Purchase
        </Button>
      </div>
    </div>
  )

  return (
    <PageShell header={header}>
      <InfoPanel title="Recording an Asset Purchase" storageKey="buy-asset-info">
        <p>
          Record a new asset purchase. The asset will be added to the register and depreciation
          will be calculated automatically based on the method selected.
        </p>
      </InfoPanel>

      {error && <InlineAlert variant="error" className="mb-4">{error}</InlineAlert>}

      <PageSection title="Asset Details">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Asset Name</label>
            <input
              type="text"
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g. Dell Latitude 5540"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 pr-7 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Select category...</option>
              <option value="plant_equipment">Plant &amp; Equipment</option>
              <option value="motor_vehicles">Motor Vehicles</option>
              <option value="office_equipment">Office Equipment</option>
              <option value="furniture_fittings">Furniture &amp; Fittings</option>
              <option value="it_equipment">IT Equipment</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Purchase Date</label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Purchase Price</label>
            <input
              type="number"
              step="0.01"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              placeholder="0.00"
            />
          </div>
        </div>
      </PageSection>

      <PageSection title="Supplier & Account">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Supplier (Contact)</label>
            <input
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Search suppliers..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">GL Account</label>
            <input
              type="text"
              value={glAccount}
              onChange={(e) => setGlAccount(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g. 1820 - Plant & Equipment"
            />
          </div>
        </div>
      </PageSection>

      <PageSection title="Depreciation">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Depreciation Method</label>
            <select
              value={depreciationMethod}
              onChange={(e) => setDepreciationMethod(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 pr-7 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Select method...</option>
              <option value="straight_line">Straight Line</option>
              <option value="diminishing_value">Diminishing Value</option>
              <option value="instant_writeoff">Instant Write-off</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Useful Life (years)
              {depreciationMethod === "instant_writeoff" && (
                <span className="ml-2 font-normal text-gray-400">N/A for instant write-off</span>
              )}
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={usefulLife}
              onChange={(e) => setUsefulLife(e.target.value)}
              disabled={depreciationMethod === "instant_writeoff"}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:text-gray-500"
              placeholder="e.g. 5"
            />
          </div>
        </div>
      </PageSection>

      <PageSection title="Description">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Optional notes about this asset..."
          />
        </div>
      </PageSection>
    </PageShell>
  )
}
