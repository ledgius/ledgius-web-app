import { useLocation, useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"

const LABELS: Record<string, string> = {
  "/": "Books Overview",
  "/invoices": "Invoices",
  "/bills": "Bills",
  "/payments": "Payments",
  "/bank-reconciliation": "Bank Reconciliation",
  "/super-obligations": "Super Obligations",
}

export function BackLink() {
  const location = useLocation()
  const navigate = useNavigate()
  const from = (location.state as { from?: string })?.from

  if (!from) return null

  const label = LABELS[from] ?? "Back"

  return (
    <button
      onClick={() => navigate(from)}
      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary-600 mb-3 transition-colors"
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      Back to {label}
    </button>
  )
}
