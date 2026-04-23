// Spec references: R-0062.
import { useState } from "react"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell, PageSection } from "@/components/layout"
import { Button, InfoPanel } from "@/components/primitives"
import { MoneyValue } from "@/components/financial"
import { useFeedback } from "@/components/feedback"
import { Play } from "lucide-react"

interface DepreciationRow {
  id: string
  asset_name: string
  method: string
  rate: number
  annual_depreciation: number
  accumulated: number
  book_value: number
}

const methodLabels: Record<string, string> = {
  straight_line: "Straight Line",
  diminishing_value: "Diminishing Value",
  instant_writeoff: "Instant Write-off",
}

export function DepreciationPage() {
  usePagePolicies(["account", "tax", "assets"])
  const feedback = useFeedback()

  // API not built yet — empty data
  const [rows] = useState<DepreciationRow[]>([])
  const isLoading = false

  // Summary totals (computed from rows when data is available)
  const totalAssets = rows.length
  const totalCost = rows.reduce((sum, r) => sum + r.book_value + r.accumulated, 0)
  const totalAccumulated = rows.reduce((sum, r) => sum + r.accumulated, 0)
  const totalBookValue = rows.reduce((sum, r) => sum + r.book_value, 0)

  const handleRunDepreciation = () => {
    feedback.info("Coming soon — depreciation run will be available once the API is ready")
  }

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Depreciation</h1>
        {totalAssets > 0 && (
          <span className="text-sm text-gray-500">{totalAssets} asset{totalAssets !== 1 ? "s" : ""}</span>
        )}
      </div>
      <p className="text-sm text-gray-500 mt-0.5">Review depreciation schedules and run periodic depreciation</p>
      <div className="flex items-center gap-3 mt-3">
        <Button onClick={handleRunDepreciation} disabled={totalAssets === 0}>
          <Play className="h-4 w-4" />
          Run Depreciation
        </Button>
      </div>
    </div>
  )

  return (
    <PageShell header={header} loading={isLoading}>
      <InfoPanel title="About Depreciation" storageKey="depreciation-info">
        <p>
          Depreciation reduces the book value of your assets over their useful life.
          Run depreciation monthly or quarterly to keep your accounts accurate.
          Instant write-off assets are fully depreciated in the purchase period.
        </p>
      </InfoPanel>

      {/* Summary cards */}
      <PageSection title="Summary">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Assets</p>
            <p className="text-lg font-semibold text-gray-900">{totalAssets}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Cost</p>
            <p className="text-lg font-semibold text-gray-900">
              <MoneyValue amount={totalCost} currency="AUD" />
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Accumulated Depreciation</p>
            <p className="text-lg font-semibold text-gray-900">
              <MoneyValue amount={totalAccumulated} currency="AUD" />
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Book Value</p>
            <p className="text-lg font-semibold text-gray-900">
              <MoneyValue amount={totalBookValue} currency="AUD" />
            </p>
          </div>
        </div>
      </PageSection>

      {/* Depreciation schedule table */}
      <PageSection title="Depreciation Schedule">
        {rows.length === 0 ? (
          <div className="border border-gray-200 rounded-lg px-4 py-8 text-center">
            <p className="text-sm text-gray-500">No assets in the register. Add assets to see their depreciation schedule.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500 text-xs">
                  <th className="py-2 pr-4">Asset Name</th>
                  <th className="py-2 pr-4">Method</th>
                  <th className="py-2 pr-4 text-right">Rate</th>
                  <th className="py-2 pr-4 text-right">Annual Depreciation</th>
                  <th className="py-2 pr-4 text-right">Accumulated</th>
                  <th className="py-2 text-right">Book Value</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium text-primary-600">{r.asset_name}</td>
                    <td className="py-2 pr-4 text-gray-600">{methodLabels[r.method] ?? r.method}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{(r.rate * 100).toFixed(1)}%</td>
                    <td className="py-2 pr-4 text-right">
                      <MoneyValue amount={r.annual_depreciation} currency="AUD" />
                    </td>
                    <td className="py-2 pr-4 text-right">
                      <MoneyValue amount={r.accumulated} currency="AUD" />
                    </td>
                    <td className="py-2 text-right font-medium">
                      <MoneyValue amount={r.book_value} currency="AUD" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>
    </PageShell>
  )
}
