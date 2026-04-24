// Spec references: R-0062, A-0040, A-0041, T-0029.
import { useState, useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell, PageSection } from "@/components/layout"
import { Button, InfoPanel, InlineAlert } from "@/components/primitives"
import { MoneyValue } from "@/components/financial"
import { useEscapeKey } from "@/hooks/useEscapeKey"
import {
  useAcquireAsset,
  useAssetCategories,
  useInstantWriteoffThreshold,
  type DepreciationMethod,
} from "../hooks/useAssets"
import { useAccounts } from "@/domains/account/hooks/useAccounts"

// Returns the 1-July anchor for the AU FY containing `date`.
// 1-Jul through 30-Jun is one FY.
function fyStartForDate(date: string): string {
  if (!date) return ""
  const d = new Date(date)
  const y = d.getMonth() < 6 ? d.getFullYear() - 1 : d.getFullYear()
  return `${y}-07-01`
}

export function BuyAssetPage() {
  usePagePolicies(["account", "tax", "assets"])
  const navigate = useNavigate()
  const handleCancel = useCallback(() => navigate("/assets"), [navigate])
  useEscapeKey(handleCancel)

  const acquire = useAcquireAsset()
  const { data: categories } = useAssetCategories()
  const { data: accounts } = useAccounts()

  // Form state — decimals held as strings until submit to avoid float drift.
  const [assetName, setAssetName] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [purchaseDate, setPurchaseDate] = useState("")
  const [costExGST, setCostExGST] = useState("")
  const [gstAmount, setGstAmount] = useState("")
  const [gstApplies, setGstApplies] = useState(true)
  const [bankAccountId, setBankAccountId] = useState("")
  const [depreciationMethod, setDepreciationMethod] = useState<DepreciationMethod | "">("")
  const [usefulLife, setUsefulLife] = useState("")
  const [residualValue, setResidualValue] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState("")

  // Surface the current-FY instant-write-off threshold for the acquisition
  // date, so we can nudge users toward it when eligible.
  const fyStart = purchaseDate ? fyStartForDate(purchaseDate) : undefined
  const { data: threshold } = useInstantWriteoffThreshold(fyStart)
  const eligibleForInstantWriteoff = useMemo(() => {
    if (!threshold || !costExGST) return false
    const cost = parseFloat(costExGST)
    const thr = parseFloat(threshold.threshold_aud)
    return !Number.isNaN(cost) && !Number.isNaN(thr) && cost > 0 && cost <= thr
  }, [costExGST, threshold])

  // Only show bank-side accounts (category 'A' — typical bank code range
  // 10xx-11xx per the AU COA seed). Users can see all category-A accounts
  // and pick the right one.
  const bankAccounts = useMemo(
    () => (accounts ?? []).filter((a) => a.category === "A" && !a.obsolete),
    [accounts],
  )

  const handleCreate = async () => {
    setError("")
    if (!assetName.trim()) return setError("Asset name is required")
    if (!categoryId) return setError("Category is required")
    if (!purchaseDate) return setError("Purchase date is required")
    if (!costExGST) return setError("Cost (ex GST) is required")
    if (!depreciationMethod) return setError("Depreciation method is required")
    if (!bankAccountId) return setError("Bank account is required")
    if (depreciationMethod !== "instant_writeoff" && !usefulLife) {
      return setError("Useful life is required for straight-line and diminishing-value methods")
    }

    try {
      const asset = await acquire.mutateAsync({
        name: assetName.trim(),
        description: description.trim() || undefined,
        category_id: categoryId,
        purchase_date: purchaseDate,
        cost_ex_gst: costExGST,
        gst_amount: gstApplies ? (gstAmount || "0") : "0",
        gst_applies: gstApplies,
        useful_life_years: usefulLife ? parseInt(usefulLife, 10) : undefined,
        residual_value: residualValue || "0",
        depreciation_method: depreciationMethod as DepreciationMethod,
        bank_account_id: parseInt(bankAccountId, 10),
      })
      navigate(`/assets/${asset.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Acquisition failed")
    }
  }

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Buy Asset</h1>
      </div>
      <p className="text-sm text-gray-500 mt-0.5">Record a new asset purchase (cash / bank mode)</p>
      <div className="flex items-center gap-2 mt-3">
        <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
        <Button onClick={handleCreate} disabled={acquire.isPending}>
          {acquire.isPending ? "Recording…" : "Record Purchase"}
        </Button>
      </div>
    </div>
  )

  return (
    <PageShell header={header}>
      <InfoPanel title="Recording an Asset Purchase" storageKey="buy-asset-info" collapsible>
        <p>
          Record a new asset purchase paid from a bank account. On submit, the system posts a
          balanced acquisition journal (Dr capital, Dr GST, Cr bank), creates the asset row with
          status <strong>Active</strong>, and writes an audit entry — all in one database
          transaction.
        </p>
        <p className="mt-1.5">
          Bill-linked acquisitions (create a new bill at the same time, or capitalise an existing
          bill line) arrive in a follow-up task. For now, cash / bank mode only.
        </p>
      </InfoPanel>

      {error && <InlineAlert variant="error" className="mb-4">{error}</InlineAlert>}

      {eligibleForInstantWriteoff && depreciationMethod !== "instant_writeoff" && (
        <InlineAlert variant="warning" className="mb-4">
          This asset (<MoneyValue amount={costExGST || "0"} currency="AUD" />) is below the
          current ATO instant asset write-off threshold
          (<MoneyValue amount={threshold?.threshold_aud ?? "0"} currency="AUD" />). Consider
          switching <strong>Depreciation Method</strong> to <em>Instant Write-off</em> to fully
          expense it in the acquisition period.
        </InlineAlert>
      )}

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
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 pr-7 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Select category...</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
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
            <label className="block text-xs font-medium text-gray-600 mb-1">Cost (ex GST)</label>
            <input
              type="number"
              step="0.01"
              value={costExGST}
              onChange={(e) => setCostExGST(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              placeholder="0.00"
            />
          </div>
        </div>
      </PageSection>

      <PageSection title="GST &amp; Payment">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 text-xs font-medium text-gray-600 mb-1">
              <input
                type="checkbox"
                checked={gstApplies}
                onChange={(e) => setGstApplies(e.target.checked)}
                className="rounded border-gray-300"
              />
              GST applies (supplier registered for GST)
            </label>
            <input
              type="number"
              step="0.01"
              value={gstApplies ? gstAmount : "0"}
              onChange={(e) => setGstAmount(e.target.value)}
              disabled={!gstApplies}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:text-gray-500"
              placeholder="0.00"
            />
            <p className="text-xs text-gray-400 mt-1">
              BAS G10 / G11 classification is derived automatically from the CAP tax code.
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Bank Account</label>
            <select
              value={bankAccountId}
              onChange={(e) => setBankAccountId(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 pr-7 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Select bank account...</option>
              {bankAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.accno} — {a.description ?? ""}</option>
              ))}
            </select>
          </div>
        </div>
      </PageSection>

      <PageSection title="Depreciation">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Depreciation Method</label>
            <select
              value={depreciationMethod}
              onChange={(e) => setDepreciationMethod(e.target.value as DepreciationMethod)}
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
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Residual Value</label>
            <input
              type="number"
              step="0.01"
              value={residualValue}
              onChange={(e) => setResidualValue(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              placeholder="0.00"
            />
            <p className="text-xs text-gray-400 mt-1">
              Estimated salvage value at end of useful life. Depreciation floors at this amount.
            </p>
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
