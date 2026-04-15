import { useState } from "react"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell, PageSection } from "@/components/layout"
import { Button, InfoPanel } from "@/components/primitives"
import { DataTable } from "@/shared/components/DataTable"
import { useCurrencies, useExchangeRates, useCreateRate, type Currency, type ExchangeRate } from "../hooks/useCurrency"
import { formatDate } from "@/shared/lib/utils"

export function CurrencyPage() {
  usePageHelp(pageHelpContent.currency)
  usePagePolicies(["reporting"])
  const { data: currencies } = useCurrencies()
  const { data: rates, isLoading, error: ratesError } = useExchangeRates()
  const createRate = useCreateRate()
  const [showForm, setShowForm] = useState(false)
  const [fromCurr, setFromCurr] = useState("")
  const [toCurr, setToCurr] = useState("AUD")
  const [rate, setRate] = useState("")
  const [effectiveDate, setEffectiveDate] = useState("")
  const [error, setError] = useState("")

  const handleCreate = async () => {
    if (!fromCurr || !toCurr || !rate || !effectiveDate) { setError("All fields required"); return }
    try {
      await createRate.mutateAsync({ from_curr: fromCurr, to_curr: toCurr, rate, effective_date: effectiveDate })
      setShowForm(false); setFromCurr(""); setRate(""); setError("")
    } catch (err: any) { setError(err.message) }
  }

  const currColumns = [
    { key: "curr", header: "Code", className: "font-mono w-16" },
    { key: "description", header: "Name", render: (r: Currency) => r.description ?? "-" },
  ]

  const rateColumns = [
    { key: "from_curr", header: "From", className: "font-mono w-16" },
    { key: "to_curr", header: "To", className: "font-mono w-16" },
    { key: "rate", header: "Rate", className: "font-mono text-right", render: (r: ExchangeRate) => parseFloat(r.rate).toFixed(4) },
    { key: "effective_date", header: "Date", render: (r: ExchangeRate) => formatDate(r.effective_date) },
    { key: "source", header: "Source", render: (r: ExchangeRate) => r.source ?? "manual" },
  ]

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Currency & Exchange Rates</h1>
      </div>
      <p className="text-sm text-gray-500 mt-0.5">Manage currencies and conversion rates</p>
      <div className="flex items-center gap-3 mt-3">
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add Rate"}
        </Button>
      </div>
    </div>
  )

  return (
    <PageShell header={header} loading={isLoading}>
      <InfoPanel title="About Currency & Exchange Rates" storageKey="currency-info">
        <p>
          Exchange rates convert foreign-currency transactions (invoices, bills, bank feeds) back to your base
          currency (AUD) for the general ledger. Every FX-denominated transaction records both the original amount and
          the AUD-equivalent at the rate effective on the transaction date.
        </p>
        <p className="mt-1.5">
          <strong>Recent Exchange Rates</strong> (left) shows the rates currently in use. <strong>Currencies</strong>{" "}
          (right) lists the ISO codes available for selection on invoices, bills, and bank accounts. Click{" "}
          <strong>Add Rate</strong> to enter a new rate for a specific date — the system uses the most recent rate
          on-or-before the transaction date.
        </p>
        <p className="mt-1.5 text-blue-600">
          The ATO requires you to use a rate from a reliable source (RBA daily rates are commonly accepted). Record
          the source so the rate is defensible at audit.
        </p>
      </InfoPanel>
      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md">{error}</div>}

      {showForm && (
        <PageSection title="Add Exchange Rate">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">From</label>
              <select value={fromCurr} onChange={e => setFromCurr(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
                <option value="">Select...</option>
                {currencies?.map(c => <option key={c.curr} value={c.curr}>{c.curr}</option>)}
              </select></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">To</label>
              <select value={toCurr} onChange={e => setToCurr(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
                {currencies?.map(c => <option key={c.curr} value={c.curr}>{c.curr}</option>)}
              </select></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Rate</label>
              <input type="number" step="0.0001" value={rate} onChange={e => setRate(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm font-mono" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Effective Date</label>
              <input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
          </div>
          <button onClick={handleCreate} className="px-4 py-1.5 text-sm rounded-md bg-primary-600 text-white hover:bg-primary-700">Add Rate</button>
        </PageSection>
      )}

      <div className="grid grid-cols-2 gap-6">
        <PageSection title="Recent Exchange Rates">
          <DataTable columns={rateColumns} data={rates ?? []} loading={isLoading} error={ratesError} emptyMessage="No exchange rates." />
        </PageSection>
        <PageSection title="Currencies">
          <DataTable columns={currColumns} data={currencies ?? []} emptyMessage="No currencies." />
        </PageSection>
      </div>
    </PageShell>
  )
}
