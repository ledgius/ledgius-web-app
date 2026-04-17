// Spec references: R-0063.
import { useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell, PageSection } from "@/components/layout"
import { Button, InfoPanel, InlineAlert } from "@/components/primitives"
import { MoneyValue } from "@/components/financial"
import { useEscapeKey } from "@/hooks/useEscapeKey"
import { useFeedback } from "@/components/feedback"

export function LoanPayoutPage() {
  usePageHelp(pageHelpContent.loanPayout)
  usePagePolicies(["account"])
  const navigate = useNavigate()
  const handleCancel = useCallback(() => navigate("/loans"), [navigate])
  useEscapeKey(handleCancel)
  const feedback = useFeedback()

  const [loanId, setLoanId] = useState("")
  const [payoutDate, setPayoutDate] = useState("")
  const [payoutAmount, setPayoutAmount] = useState("")
  const [terminationFee, setTerminationFee] = useState("")
  const [error, setError] = useState("")

  // Simulated current balance for the selected loan (will come from API)
  const selectedBalance = loanId ? 0 : null
  const payoutNum = parseFloat(payoutAmount) || 0
  const feeNum = parseFloat(terminationFee) || 0
  const totalPayout = payoutNum + feeNum

  // Simulated remaining term savings (will come from API)
  const remainingInterest = loanId ? 0 : null
  const savings = remainingInterest !== null ? remainingInterest - feeNum : null

  const handleSubmit = async () => {
    setError("")
    if (!loanId || !payoutDate || !payoutAmount) {
      setError("Loan, payout date, and payout amount are required")
      return
    }
    // API not built yet
    feedback.info("Coming soon", "Loan payout will be available once the API is ready")
  }

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Loan Payout</h1>
      </div>
      <p className="text-sm text-gray-500 mt-0.5">Close out a loan with a final payout</p>
      <div className="flex items-center gap-2 mt-3">
        <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
        <Button onClick={handleSubmit}>
          Record Payout
        </Button>
      </div>
    </div>
  )

  return (
    <PageShell header={header}>
      <InfoPanel title="About Loan Payout" storageKey="loan-payout-info">
        <p>
          Close out a loan by recording the final payout. This zeros the loan balance,
          records any early termination fees, and creates the closing journal entries.
        </p>
      </InfoPanel>

      {error && <InlineAlert variant="error" className="mb-4">{error}</InlineAlert>}

      <PageSection title="Payout Details">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Select Loan</label>
            <select
              value={loanId}
              onChange={(e) => setLoanId(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 pr-7 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Select a loan...</option>
              {/* Options populated from API when available */}
            </select>
            {loanId === "" && (
              <p className="text-xs text-gray-400 mt-1">No loans in register. Add loans first.</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Payout Date</label>
            <input
              type="date"
              value={payoutDate}
              onChange={(e) => setPayoutDate(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Payout Amount</label>
            <input
              type="number"
              step="0.01"
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Early Termination Fee
              <span className="ml-2 font-normal text-gray-400">optional</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={terminationFee}
              onChange={(e) => setTerminationFee(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              placeholder="0.00"
            />
          </div>
        </div>
      </PageSection>

      {/* Balance and savings calculation panel */}
      {loanId && (
        <PageSection title="Payout Summary">
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Current Balance</p>
                <p className="font-medium text-gray-900">
                  <MoneyValue amount={selectedBalance ?? 0} currency="AUD" />
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Payout Amount</p>
                <p className="font-medium text-gray-900">
                  <MoneyValue amount={payoutNum} currency="AUD" />
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Termination Fee</p>
                <p className="font-medium text-gray-900">
                  <MoneyValue amount={feeNum} currency="AUD" />
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Payout</p>
                <p className="font-semibold text-gray-900">
                  <MoneyValue amount={totalPayout} currency="AUD" />
                </p>
              </div>
            </div>
            {savings !== null && (
              <div className="mt-4 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  Estimated Savings vs Remaining Term
                </p>
                <p className={`font-semibold ${savings >= 0 ? "text-green-700" : "text-red-700"}`}>
                  <MoneyValue amount={Math.abs(savings)} currency="AUD" />
                  <span className="ml-1 text-xs font-normal text-gray-500">
                    {savings >= 0 ? "saved in interest" : "more than remaining interest"}
                  </span>
                </p>
              </div>
            )}
          </div>
        </PageSection>
      )}
    </PageShell>
  )
}
