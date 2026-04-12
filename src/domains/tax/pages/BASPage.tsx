import { useState } from "react"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell } from "@/components/layout"
import { useBAS, useGSTDetail } from "../hooks/useBAS"
import { formatCurrency } from "@/shared/lib/utils"

export function BASPage() {
  usePageHelp(pageHelpContent.bas)
  usePagePolicies(["tax"])
  const [from, setFrom] = useState("2026-01-01")
  const [to, setTo] = useState("2026-03-31")
  const [showDetail, setShowDetail] = useState(false)

  const { data: bas, isLoading } = useBAS(from, to)
  const { data: detail } = useGSTDetail(from, to)

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Business Activity Statement</h1>
      </div>
      <p className="text-sm text-gray-500 mt-0.5">Prepare and lodge your BAS with the ATO</p>
    </div>
  )

  return (
    <PageShell header={header}>
      <div className="flex gap-4 mb-6">
        <label className="text-sm text-gray-600">From: <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="ml-1 border rounded px-2 py-1 text-sm" /></label>
        <label className="text-sm text-gray-600">To: <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="ml-1 border rounded px-2 py-1 text-sm" /></label>
      </div>

      {isLoading ? <p>Loading...</p> : bas ? (
        <div className="space-y-6">
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Period: {bas.period.label}</h3>
            <div className="grid grid-cols-3 gap-4">
              <SummaryCard label="1A - GST on Sales" value={bas["1A"]} />
              <SummaryCard label="1B - GST on Purchases" value={bas["1B"]} />
              <SummaryCard label="Net GST Owed" value={bas.gst_owed} highlight />
            </div>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-semibold mb-3">GST Sales (G-labels)</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
              <LabelRow code="G1" label="Total sales" value={bas.G1} />
              <LabelRow code="G6" label="Sales subject to GST" value={bas.G6} />
              <LabelRow code="G9" label="GST on sales" value={bas.G9} />
            </div>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-semibold mb-3">GST Purchases (G-labels)</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
              <LabelRow code="G11" label="Non-capital purchases" value={bas.G11} />
              <LabelRow code="G17" label="Purchases subject to GST" value={bas.G17} />
              <LabelRow code="G20" label="GST on purchases" value={bas.G20} />
            </div>
          </div>

          <button
            onClick={() => setShowDetail(!showDetail)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showDetail ? "Hide" : "Show"} GST Transaction Detail
          </button>

          {showDetail && detail && (
            <div className="space-y-4">
              <div className="bg-white border rounded-lg p-4">
                <h4 className="font-semibold mb-2">Sales ({detail.sales?.length ?? 0})</h4>
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs text-gray-500 border-b">
                    <th className="py-2">Ref</th><th>Customer</th><th className="text-right">Net</th><th className="text-right">GST</th><th className="text-right">Gross</th>
                  </tr></thead>
                  <tbody>
                    {detail.sales?.map((s) => (
                      <tr key={s.trans_id} className="border-b border-gray-100">
                        <td className="py-1.5 font-mono">{s.reference}</td>
                        <td>{s.contact_name}</td>
                        <td className="text-right font-mono">{formatCurrency(s.net_amount)}</td>
                        <td className="text-right font-mono">{formatCurrency(s.gst_amount)}</td>
                        <td className="text-right font-mono">{formatCurrency(s.gross_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-white border rounded-lg p-4">
                <h4 className="font-semibold mb-2">Purchases ({detail.purchases?.length ?? 0})</h4>
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs text-gray-500 border-b">
                    <th className="py-2">Ref</th><th>Vendor</th><th className="text-right">Net</th><th className="text-right">GST</th><th className="text-right">Gross</th>
                  </tr></thead>
                  <tbody>
                    {detail.purchases?.map((p) => (
                      <tr key={p.trans_id} className="border-b border-gray-100">
                        <td className="py-1.5 font-mono">{p.reference}</td>
                        <td>{p.contact_name}</td>
                        <td className="text-right font-mono">{formatCurrency(p.net_amount)}</td>
                        <td className="text-right font-mono">{formatCurrency(p.gst_amount)}</td>
                        <td className="text-right font-mono">{formatCurrency(p.gross_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </PageShell>
  )
}

function SummaryCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`p-3 rounded-lg ${highlight ? "bg-blue-50 border border-blue-200" : "bg-gray-50"}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-mono font-semibold ${highlight ? "text-blue-700" : ""}`}>{formatCurrency(value)}</p>
    </div>
  )
}

function LabelRow({ code, label, value }: { code: string; label: string; value: string }) {
  return (
    <div className="flex justify-between py-1">
      <span><span className="font-mono text-gray-400 mr-2">{code}</span>{label}</span>
      <span className="font-mono">{formatCurrency(value)}</span>
    </div>
  )
}
