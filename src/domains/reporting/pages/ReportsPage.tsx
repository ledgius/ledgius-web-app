import { useState } from "react"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell } from "@/components/layout"
import { DataTable } from "@/shared/components/DataTable"
import {
  useTrialBalance, useProfitLoss, useBalanceSheet,
  useARAgeingReport, useAPAgeingReport, useCashFlowReport,
  useGLDetailReport, useCustomerStatement, useVendorStatement,
  type TrialBalanceLine, type AgeingReport, type CashFlowReport, type StatementReport,
} from "../hooks/useReports"
import { useAccounts } from "@/domains/account/hooks/useAccounts"
import { useCustomers, useVendors } from "@/domains/contact/hooks/useContacts"
import { formatCurrency, formatDate } from "@/shared/lib/utils"

type ReportTab = "trial-balance" | "profit-loss" | "balance-sheet" | "ar-ageing" | "ap-ageing" | "cash-flow" | "gl-detail" | "customer-statement" | "vendor-statement"

const tabLabels: Record<ReportTab, string> = {
  "trial-balance": "Trial Balance",
  "profit-loss": "Profit & Loss",
  "balance-sheet": "Balance Sheet",
  "ar-ageing": "AR Ageing",
  "ap-ageing": "AP Ageing",
  "cash-flow": "Cash Flow",
  "gl-detail": "GL Detail",
  "customer-statement": "Customer Statement",
  "vendor-statement": "Vendor Statement",
}

export function ReportsPage() {
  usePageHelp(pageHelpContent.reports)
  usePagePolicies(["reporting"])
  const [tab, setTab] = useState<ReportTab>("trial-balance")
  const [from, setFrom] = useState("2026-01-01")
  const [to, setTo] = useState("2026-06-30")
  const [asAt, setAsAt] = useState("2026-06-30")

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Reports</h1>
      </div>
    </div>
  )

  return (
    <PageShell header={header}>
      <div className="flex gap-1 mb-4 border-b overflow-x-auto">
        {(Object.keys(tabLabels) as ReportTab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px whitespace-nowrap transition-colors ${
              tab === t ? "border-gray-900 text-gray-900 font-medium" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            {tabLabels[t]}
          </button>
        ))}
      </div>

      {tab === "trial-balance" && <TrialBalance />}
      {tab === "profit-loss" && <ProfitLoss from={from} to={to} onFromChange={setFrom} onToChange={setTo} />}
      {tab === "balance-sheet" && <BalanceSheet asAt={asAt} onDateChange={setAsAt} />}
      {tab === "ar-ageing" && <ARAgeingTab />}
      {tab === "ap-ageing" && <APAgeingTab />}
      {tab === "cash-flow" && <CashFlowTab from={from} to={to} onFromChange={setFrom} onToChange={setTo} />}
      {tab === "gl-detail" && <GLDetailTab from={from} to={to} onFromChange={setFrom} onToChange={setTo} />}
      {tab === "customer-statement" && <CustomerStatementTab />}
      {tab === "vendor-statement" && <VendorStatementTab />}
    </PageShell>
  )
}

function TrialBalance() {
  const { data, isLoading } = useTrialBalance()
  const columns = [
    { key: "accno", header: "Code", className: "font-mono w-20" },
    { key: "description", header: "Account" },
    { key: "debit", header: "Debit", className: "text-right font-mono", render: (r: TrialBalanceLine) => r.debit !== "0" ? formatCurrency(r.debit) : "" },
    { key: "credit", header: "Credit", className: "text-right font-mono", render: (r: TrialBalanceLine) => r.credit !== "0" ? formatCurrency(r.credit) : "" },
  ]
  return isLoading ? <p>Loading...</p> : <DataTable columns={columns} data={data ?? []} />
}

function ProfitLoss({ from, to, onFromChange, onToChange }: { from: string; to: string; onFromChange: (v: string) => void; onToChange: (v: string) => void }) {
  const { data, isLoading } = useProfitLoss(from, to)
  return (
    <>
      <div className="flex gap-4 mb-4">
        <label className="text-sm text-gray-600">From: <input type="date" value={from} onChange={(e) => onFromChange(e.target.value)} className="ml-1 border rounded px-2 py-1 text-sm" /></label>
        <label className="text-sm text-gray-600">To: <input type="date" value={to} onChange={(e) => onToChange(e.target.value)} className="ml-1 border rounded px-2 py-1 text-sm" /></label>
      </div>
      {isLoading ? <p>Loading...</p> : data ? (
        <div className="space-y-6">
          <section>
            <h3 className="font-semibold text-gray-700 mb-2">Income</h3>
            {data.income?.map((l) => (
              <div key={l.accno} className="flex justify-between py-1 px-2 text-sm">
                <span>{l.accno} - {l.description}</span>
                <span className="font-mono">{formatCurrency(l.amount)}</span>
              </div>
            ))}
          </section>
          <section>
            <h3 className="font-semibold text-gray-700 mb-2">Expenses</h3>
            {data.expenses?.map((l) => (
              <div key={l.accno} className="flex justify-between py-1 px-2 text-sm">
                <span>{l.accno} - {l.description}</span>
                <span className="font-mono">{formatCurrency(l.amount)}</span>
              </div>
            ))}
          </section>
          <div className="border-t pt-3 flex justify-between font-semibold text-lg">
            <span>Net Profit</span>
            <span className="font-mono">{formatCurrency(data.net_profit)}</span>
          </div>
        </div>
      ) : null}
    </>
  )
}

function BalanceSheet({ asAt, onDateChange }: { asAt: string; onDateChange: (v: string) => void }) {
  const { data, isLoading } = useBalanceSheet(asAt)
  return (
    <>
      <div className="mb-4">
        <label className="text-sm text-gray-600">As at: <input type="date" value={asAt} onChange={(e) => onDateChange(e.target.value)} className="ml-1 border rounded px-2 py-1 text-sm" /></label>
      </div>
      {isLoading ? <p>Loading...</p> : data ? (
        <div className="space-y-6">
          {(["Assets", "Liabilities", "Equity"] as const).map((section) => {
            const key = section.toLowerCase() as "assets" | "liabilities" | "equity"
            const items = data[key] ?? []
            const total = data[`total_${key}` as keyof typeof data] as string
            return (
              <section key={section}>
                <h3 className="font-semibold text-gray-700 mb-2">{section}</h3>
                {items.map((l) => (
                  <div key={l.accno} className="flex justify-between py-1 px-2 text-sm">
                    <span>{l.accno} - {l.description}</span>
                    <span className="font-mono">{formatCurrency(l.balance)}</span>
                  </div>
                ))}
                <div className="border-t mt-1 pt-1 flex justify-between font-medium text-sm px-2">
                  <span>Total {section}</span>
                  <span className="font-mono">{formatCurrency(total)}</span>
                </div>
              </section>
            )
          })}
        </div>
      ) : null}
    </>
  )
}

function ARAgeingTab() {
  const { data, isLoading } = useARAgeingReport()
  return isLoading ? <p>Loading...</p> : data ? <AgeingTable report={data} /> : null
}

function APAgeingTab() {
  const { data, isLoading } = useAPAgeingReport()
  return isLoading ? <p>Loading...</p> : data ? <AgeingTable report={data} /> : null
}

function AgeingTable({ report }: { report: AgeingReport }) {
  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="text-left px-4 py-2 font-medium text-gray-600">Contact</th>
            <th className="text-right px-4 py-2 font-medium text-gray-600">Current</th>
            <th className="text-right px-4 py-2 font-medium text-gray-600">1-30</th>
            <th className="text-right px-4 py-2 font-medium text-gray-600">31-60</th>
            <th className="text-right px-4 py-2 font-medium text-gray-600">61-90</th>
            <th className="text-right px-4 py-2 font-medium text-gray-600">90+</th>
            <th className="text-right px-4 py-2 font-medium text-gray-600">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {report.lines.map(line => (
            <tr key={line.contact_id}>
              <td className="px-4 py-2">{line.contact_name}</td>
              <td className="px-4 py-2 text-right font-mono">{fmtBucket(line.buckets.current)}</td>
              <td className="px-4 py-2 text-right font-mono">{fmtBucket(line.buckets.days_30)}</td>
              <td className="px-4 py-2 text-right font-mono">{fmtBucket(line.buckets.days_60)}</td>
              <td className="px-4 py-2 text-right font-mono">{fmtBucket(line.buckets.days_90)}</td>
              <td className="px-4 py-2 text-right font-mono text-red-600">{fmtBucket(line.buckets.over_90)}</td>
              <td className="px-4 py-2 text-right font-mono font-medium">{formatCurrency(line.buckets.total)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-gray-50 border-t font-medium">
          <tr>
            <td className="px-4 py-2">Totals</td>
            <td className="px-4 py-2 text-right font-mono">{fmtBucket(report.totals.current)}</td>
            <td className="px-4 py-2 text-right font-mono">{fmtBucket(report.totals.days_30)}</td>
            <td className="px-4 py-2 text-right font-mono">{fmtBucket(report.totals.days_60)}</td>
            <td className="px-4 py-2 text-right font-mono">{fmtBucket(report.totals.days_90)}</td>
            <td className="px-4 py-2 text-right font-mono text-red-600">{fmtBucket(report.totals.over_90)}</td>
            <td className="px-4 py-2 text-right font-mono font-semibold">{formatCurrency(report.totals.total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function fmtBucket(val: string) {
  const n = parseFloat(val)
  return n === 0 ? "-" : formatCurrency(val)
}

function CashFlowTab({ from, to, onFromChange, onToChange }: { from: string; to: string; onFromChange: (v: string) => void; onToChange: (v: string) => void }) {
  const { data, isLoading } = useCashFlowReport(from, to)
  return (
    <>
      <div className="flex gap-4 mb-4">
        <label className="text-sm text-gray-600">From: <input type="date" value={from} onChange={(e) => onFromChange(e.target.value)} className="ml-1 border rounded px-2 py-1 text-sm" /></label>
        <label className="text-sm text-gray-600">To: <input type="date" value={to} onChange={(e) => onToChange(e.target.value)} className="ml-1 border rounded px-2 py-1 text-sm" /></label>
      </div>
      {isLoading ? <p>Loading...</p> : data ? <CashFlowDisplay data={data} /> : null}
    </>
  )
}

function GLDetailTab({ from, to, onFromChange, onToChange }: { from: string; to: string; onFromChange: (v: string) => void; onToChange: (v: string) => void }) {
  const { data: accounts } = useAccounts()
  const [accountId, setAccountId] = useState(0)
  const { data, isLoading } = useGLDetailReport(accountId, from, to)
  return (
    <>
      <div className="flex gap-4 mb-4">
        <select value={accountId} onChange={e => setAccountId(parseInt(e.target.value))} className="border rounded px-2 py-1 text-sm">
          <option value={0}>Select account...</option>
          {accounts?.map(a => <option key={a.id} value={a.id}>{a.accno} — {a.description}</option>)}
        </select>
        <label className="text-sm text-gray-600">From: <input type="date" value={from} onChange={e => onFromChange(e.target.value)} className="ml-1 border rounded px-2 py-1 text-sm" /></label>
        <label className="text-sm text-gray-600">To: <input type="date" value={to} onChange={e => onToChange(e.target.value)} className="ml-1 border rounded px-2 py-1 text-sm" /></label>
      </div>
      {isLoading ? <p>Loading...</p> : data ? (
        <div>
          <div className="flex justify-between text-sm mb-3 px-2">
            <span>Opening Balance: <strong className="font-mono">{formatCurrency(data.opening_balance)}</strong></span>
            <span>Closing Balance: <strong className="font-mono">{formatCurrency(data.closing_balance)}</strong></span>
          </div>
          <table className="w-full border rounded-lg text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Date</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Reference</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Description</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">Debit</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">Credit</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.lines.map(line => (
                <tr key={line.entry_id}>
                  <td className="px-3 py-1.5">{line.transdate ? formatDate(line.transdate) : "-"}</td>
                  <td className="px-3 py-1.5 font-mono">{line.reference}</td>
                  <td className="px-3 py-1.5">{line.description}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{parseFloat(line.debit) > 0 ? formatCurrency(line.debit) : ""}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{parseFloat(line.credit) > 0 ? formatCurrency(line.credit) : ""}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{formatCurrency(line.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : accountId > 0 ? <p className="text-gray-500">Select date range.</p> : <p className="text-gray-500">Select an account.</p>}
    </>
  )
}

function CashFlowDisplay({ data }: { data: CashFlowReport }) {
  const sections = [data.operating, data.investing, data.financing].filter(Boolean)
  return (
    <div className="space-y-6">
      {sections.map(section => (
        <section key={section.label}>
          <h3 className="font-semibold text-gray-700 mb-2">{section.label}</h3>
          {(section.items ?? []).map((item, idx) => (
            <div key={idx} className="flex justify-between py-1 px-2 text-sm">
              <span>{item.description}</span>
              <span className="font-mono">{formatCurrency(item.amount)}</span>
            </div>
          ))}
          <div className="border-t mt-1 pt-1 flex justify-between font-medium text-sm px-2">
            <span>Total {section.label}</span>
            <span className="font-mono">{formatCurrency(section.total)}</span>
          </div>
        </section>
      ))}

      <div className="border-t-2 pt-3 space-y-2">
        <div className="flex justify-between text-sm px-2">
          <span>Opening Cash</span>
          <span className="font-mono">{formatCurrency(data.opening_cash)}</span>
        </div>
        <div className="flex justify-between text-sm px-2">
          <span>Net Change in Cash</span>
          <span className="font-mono">{formatCurrency(data.net_change)}</span>
        </div>
        <div className="flex justify-between font-semibold text-lg px-2">
          <span>Closing Cash</span>
          <span className="font-mono">{formatCurrency(data.closing_cash)}</span>
        </div>
      </div>
    </div>
  )
}

function CustomerStatementTab() {
  const { data: customers } = useCustomers()
  const [customerId, setCustomerId] = useState(0)
  const { data, isLoading } = useCustomerStatement(customerId)
  return (
    <>
      <div className="mb-4">
        <select value={customerId} onChange={e => setCustomerId(parseInt(e.target.value))} className="border rounded px-2 py-1 text-sm">
          <option value={0}>Select customer...</option>
          {customers?.map(c => <option key={c.id} value={c.id}>{c.name} ({c.meta_number})</option>)}
        </select>
      </div>
      {isLoading ? <p>Loading...</p> : data ? <StatementDisplay data={data} /> : customerId > 0 ? null : <p className="text-gray-500">Select a customer.</p>}
    </>
  )
}

function VendorStatementTab() {
  const { data: vendors } = useVendors()
  const [vendorId, setVendorId] = useState(0)
  const { data, isLoading } = useVendorStatement(vendorId)
  return (
    <>
      <div className="mb-4">
        <select value={vendorId} onChange={e => setVendorId(parseInt(e.target.value))} className="border rounded px-2 py-1 text-sm">
          <option value={0}>Select vendor...</option>
          {vendors?.map(v => <option key={v.id} value={v.id}>{v.name} ({v.meta_number})</option>)}
        </select>
      </div>
      {isLoading ? <p>Loading...</p> : data ? <StatementDisplay data={data} /> : vendorId > 0 ? null : <p className="text-gray-500">Select a vendor.</p>}
    </>
  )
}

function StatementDisplay({ data }: { data: StatementReport }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-3 px-2">
        <div>
          <strong>{data.contact_name}</strong>
          <span className="text-gray-500 ml-2">({data.meta_number})</span>
        </div>
        <div>
          <span>Opening: <strong className="font-mono">{formatCurrency(data.opening_balance)}</strong></span>
          <span className="ml-4">Closing: <strong className="font-mono">{formatCurrency(data.closing_balance)}</strong></span>
        </div>
      </div>
      <table className="w-full border rounded-lg text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="text-left px-3 py-2 font-medium text-gray-600">Date</th>
            <th className="text-left px-3 py-2 font-medium text-gray-600">Reference</th>
            <th className="text-left px-3 py-2 font-medium text-gray-600">Description</th>
            <th className="text-left px-3 py-2 font-medium text-gray-600 w-16">Type</th>
            <th className="text-right px-3 py-2 font-medium text-gray-600">Amount</th>
            <th className="text-right px-3 py-2 font-medium text-gray-600">Balance</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.lines.map(line => (
            <tr key={line.trans_id}>
              <td className="px-3 py-1.5">{line.transdate ? formatDate(line.transdate) : "-"}</td>
              <td className="px-3 py-1.5 font-mono">{line.reference}</td>
              <td className="px-3 py-1.5">{line.description}</td>
              <td className="px-3 py-1.5"><span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 uppercase">{line.type}</span></td>
              <td className="px-3 py-1.5 text-right font-mono">{formatCurrency(line.amount)}</td>
              <td className="px-3 py-1.5 text-right font-mono">{formatCurrency(line.balance)}</td>
            </tr>
          ))}
          {data.lines.length === 0 && <tr><td colSpan={6} className="px-3 py-4 text-center text-gray-500">No transactions.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
