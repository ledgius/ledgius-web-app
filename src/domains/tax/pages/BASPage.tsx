import { BackLink } from "@/components/primitives"
import { useState } from "react"
import { Link } from "react-router-dom"
import { CheckCircle2, Circle, Clock } from "lucide-react"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell } from "@/components/layout"
import { InfoPanel } from "@/components/primitives"
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

  // Progress signals derived from loaded data. See A-0014 §26b status-indicator rules.
  const periodChosen = !!from && !!to
  const basLoaded = !!bas
  const salesCount = detail?.sales?.length ?? 0
  const purchasesCount = detail?.purchases?.length ?? 0
  const hasTransactions = basLoaded && (salesCount > 0 || purchasesCount > 0)
  const hasBothSides = basLoaded && salesCount > 0 && purchasesCount > 0
  const gstCalculated = basLoaded && bas.gst_owed !== undefined

  // BAS due date rules (ATO):
  //   Quarterly BAS: 28th of the month after period end — except Q2 (Oct–Dec)
  //     which is extended to 28 Feb due to the Christmas/New Year break.
  //   Monthly BAS: 21st of the month after period end.
  //   BAS agents get a further ~4-week extension; not modelled here.
  // A period is "quarterly" if the `to` date lands on Mar 31 / Jun 30 /
  // Sep 30 / Dec 31; otherwise treat as monthly.
  const basDeadline = (() => {
    if (!to) return null
    const toDate = new Date(to + "T00:00:00")
    if (isNaN(toDate.getTime())) return null
    const m = toDate.getMonth() // 0-indexed
    const d = toDate.getDate()
    const y = toDate.getFullYear()
    const isQuarterEnd = (m === 2 && d === 31) || (m === 5 && d === 30) || (m === 8 && d === 30) || (m === 11 && d === 31)
    let due: Date
    if (isQuarterEnd) {
      // Q2 (Oct–Dec, month index 11) → due 28 Feb of next calendar year.
      if (m === 11) due = new Date(y + 1, 1, 28)
      else due = new Date(y, m + 1, 28)
    } else {
      // Monthly — 21st of month following `to`.
      due = new Date(y, m + 1, 21)
    }
    const msPerDay = 1000 * 60 * 60 * 24
    const daysRemaining = Math.ceil((due.getTime() - Date.now()) / msPerDay)
    return { due, daysRemaining, cycle: isQuarterEnd ? "quarterly" : "monthly" as const }
  })()

  const formatAUDate = (d: Date) =>
    d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })

  return (
    <PageShell header={header}>
      <BackLink />
      <InfoPanel title="Prepare your BAS" storageKey="bas-info">
        <div className="space-y-2">
          <StepRow
            done={periodChosen}
            text={<>
              <strong>1. Choose the BAS period</strong> using the <strong>From</strong> and <strong>To</strong> dates
              below. Most businesses lodge quarterly; check your ATO reporting cycle.
            </>}
          />
          <StepRow
            done={hasBothSides}
            partial={hasTransactions && !hasBothSides}
            text={<>
              <strong>2. Enter bills and invoices for the period.</strong>{" "}
              {basLoaded ? (
                <>
                  <span className="text-blue-700">
                    {salesCount} sales, {purchasesCount} purchases in this period.
                  </span>{" "}
                </>
              ) : null}
              Create any missing <Link to="/invoices" className="underline font-medium">invoices</Link> and{" "}
              <Link to="/bills" className="underline font-medium">bills</Link> before locking the BAS — the BAS totals
              only include transactions dated in the period.
            </>}
          />
          <StepRow
            done={gstCalculated}
            partial={basLoaded && !gstCalculated}
            text={<>
              <strong>3. Review the G-labels and Net GST Owed.</strong> 1A (GST on sales) and 1B (GST on purchases)
              drive the final amount. Click <strong>Show GST Transaction Detail</strong> below to drill into the
              contributing invoices and bills.
            </>}
          />
          <StepRow
            done={false}
            text={<>
              <strong>4. Lodge with the ATO.</strong>{" "}
              {basDeadline && (
                <span className={
                  basDeadline.daysRemaining < 0
                    ? "font-medium text-red-700"
                    : basDeadline.daysRemaining <= 7
                      ? "font-medium text-amber-700"
                      : "font-medium text-green-700"
                }>
                  BAS due: {formatAUDate(basDeadline.due)}
                  {" · "}
                  {basDeadline.daysRemaining < 0
                    ? `${Math.abs(basDeadline.daysRemaining)} days overdue`
                    : basDeadline.daysRemaining === 0
                      ? "due today"
                      : `${basDeadline.daysRemaining} days remaining`}
                  {" ("}{basDeadline.cycle}{" cycle). "}
                </span>
              )}
              Use the computed 1A / 1B / 7 / 7A values in the ATO Business Portal or your BAS agent's system. Ledgius
              does not currently submit BAS electronically — this is a manual step. Registered BAS agents receive
              approximately a further 4 weeks' extension.
            </>}
          />
        </div>
      </InfoPanel>
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

function StepRow({ done, partial, text }: { done: boolean; partial?: boolean; text: React.ReactNode }) {
  const icon = done
    ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
    : partial
      ? <Clock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
      : <Circle className="h-4 w-4 text-gray-300 shrink-0 mt-0.5" />
  return (
    <div className="flex items-start gap-2">
      {icon}
      <p className="text-xs leading-relaxed">{text}</p>
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
