import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a monetary value for display. Accepts DecimalString, plain string,
 * or number. Display-only — does not affect stored precision (A-0048 §10).
 * Prefer formatDecimal() from shared/lib/decimal.ts for new code.
 */
export function formatCurrency(amount: number | string, currency = "AUD"): string {
  if (amount === null || amount === undefined || amount === "") return "$0.00"
  const num = typeof amount === "string" ? parseFloat(amount) : amount
  if (isNaN(num)) return "$0.00"
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(num)
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}
