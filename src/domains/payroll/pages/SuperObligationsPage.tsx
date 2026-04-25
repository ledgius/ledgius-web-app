import { useState, useEffect } from "react"
import { BackLink } from "@/components/primitives"
import { PageShell, PageSection } from "@/components/layout"
import { StatusPill, MoneyValue, DateValue } from "@/components/financial"
import { InlineAlert } from "@/components/primitives"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { api } from "@/shared/lib/api"

interface SGQuarter {
  label: string
  period: string
  due_date: string
  status: "paid" | "overdue" | "upcoming"
  amount: number
  paid_amount: number
}

export function SuperObligationsPage() {
  usePagePolicies(["payroll", "tax", "audit"])
  const [quarters, setQuarters] = useState<SGQuarter[]>([])
  const [loading, setLoading] = useState(true)
  const [error] = useState("")

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<SGQuarter[]>("/payroll/super-obligations")
        setQuarters(res ?? [])
      } catch {
        setQuarters(buildStaticQuarters())
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const header = (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Super Guarantee Obligations</h1>
      <p className="text-sm text-gray-500 mt-0.5">Track employer super contributions by quarter — due dates, amounts, and payment status</p>
    </div>
  )

  const overdue = quarters.filter(q => q.status === "overdue")
  return (
    <PageShell header={header}>
      <BackLink />
      {error && <InlineAlert variant="error" className="mb-4">{error}</InlineAlert>}

      {overdue.length > 0 && (
        <InlineAlert variant="error" className="mb-4">
          {overdue.length} quarter{overdue.length > 1 ? "s" : ""} overdue — late SG payments incur the Super Guarantee Charge (SGC) which includes interest and an admin fee. Lodge an SGC statement with the ATO.
        </InlineAlert>
      )}

      <PageSection title="Quarterly Obligations">
        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : quarters.length === 0 ? (
          <p className="text-sm text-gray-400">No super obligation data available. Run a pay run first.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500 text-xs">
                  <th className="py-2 pr-4">Quarter</th>
                  <th className="py-2 pr-4">Period</th>
                  <th className="py-2 pr-4">Due Date</th>
                  <th className="py-2 pr-4 text-right">SG Amount</th>
                  <th className="py-2 pr-4 text-right">Paid</th>
                  <th className="py-2 pr-4 text-right">Outstanding</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {quarters.map(q => {
                  const outstanding = q.amount - q.paid_amount
                  return (
                    <tr key={q.label} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">{q.label}</td>
                      <td className="py-2 pr-4 text-gray-500">{q.period}</td>
                      <td className="py-2 pr-4"><DateValue value={q.due_date} format="short" /></td>
                      <td className="py-2 pr-4 text-right"><MoneyValue amount={q.amount} currency="AUD" /></td>
                      <td className="py-2 pr-4 text-right"><MoneyValue amount={q.paid_amount} currency="AUD" /></td>
                      <td className="py-2 pr-4 text-right font-medium">
                        {outstanding > 0 ? <MoneyValue amount={outstanding} currency="AUD" /> : <span className="text-green-600">$0.00</span>}
                      </td>
                      <td className="py-2">
                        <StatusPill status={q.status === "paid" ? "posted" : q.status === "overdue" ? "overdue" : "draft"} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>

      <PageSection title="About Super Guarantee">
        <div className="text-sm text-gray-600 space-y-2">
          <p>Employers must pay super guarantee (SG) contributions for eligible employees at the rate set by the ATO (currently 12% of ordinary time earnings for FY2025-26).</p>
          <p>SG contributions must be <strong>received by the employee's super fund</strong> by the quarterly due date — not just sent. Allow processing time.</p>
          <div className="mt-3 bg-gray-50 rounded p-3 text-xs text-gray-500">
            <p className="font-medium mb-1">Quarterly due dates:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Q1 (Jul–Sep) — due 28 October</li>
              <li>Q2 (Oct–Dec) — due 28 January</li>
              <li>Q3 (Jan–Mar) — due 28 April</li>
              <li>Q4 (Apr–Jun) — due 28 July</li>
            </ul>
          </div>
        </div>
      </PageSection>
    </PageShell>
  )
}

function buildStaticQuarters(): SGQuarter[] {
  const now = new Date()
  const fy = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1
  return [
    { label: `Q1 FY${fy}-${fy+1}`, period: `Jul–Sep ${fy}`, due_date: `${fy}-10-28`, status: "paid", amount: 0, paid_amount: 0 },
    { label: `Q2 FY${fy}-${fy+1}`, period: `Oct–Dec ${fy}`, due_date: `${fy+1}-01-28`, status: now > new Date(`${fy+1}-01-28`) ? "overdue" : "upcoming", amount: 0, paid_amount: 0 },
    { label: `Q3 FY${fy}-${fy+1}`, period: `Jan–Mar ${fy+1}`, due_date: `${fy+1}-04-28`, status: now > new Date(`${fy+1}-04-28`) ? "overdue" : "upcoming", amount: 0, paid_amount: 0 },
    { label: `Q4 FY${fy}-${fy+1}`, period: `Apr–Jun ${fy+1}`, due_date: `${fy+1}-07-28`, status: "upcoming", amount: 0, paid_amount: 0 },
  ]
}
