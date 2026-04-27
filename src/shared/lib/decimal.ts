// Spec references: A-0048 §3.3 (TypeScript representation layer).
//
// Branded decimal string type and arithmetic utilities for monetary
// values. All monetary values from the API arrive as string-encoded
// decimals (e.g. "1234.5600"). This module provides:
//
//   1. DecimalString — branded type preventing accidental use as plain string
//   2. Decimal arithmetic via decimal.js (exact, no float)
//   3. Formatting utilities that accept DecimalString
//   4. Validation/parsing at the API boundary

import Decimal from "decimal.js"

// Configure decimal.js per A-0048: 28 digits precision, ROUND_HALF_UP.
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP })

// ── Branded types ──────────────────────────────────────────────────

/** A string-encoded decimal value (e.g. "1234.56"). Branded to prevent
 *  accidental assignment from arbitrary strings. */
export type DecimalString = string & { readonly __brand: "DecimalString" }

/** Parse an API response value into a DecimalString. Validates that the
 *  input is a parseable decimal. Returns "0" for null/undefined/empty. */
export function toDecimalString(value: string | number | null | undefined): DecimalString {
  if (value === null || value === undefined || value === "") return "0" as DecimalString
  const s = String(value)
  // Validate — decimal.js will throw on invalid input
  try {
    new Decimal(s)
  } catch {
    return "0" as DecimalString
  }
  return s as DecimalString
}

/** Unsafe cast — only use when you are certain the string is a valid decimal
 *  (e.g. from a typed API response interface). Prefer toDecimalString() at boundaries. */
export function unsafeDecimalString(value: string): DecimalString {
  return value as DecimalString
}

// ── Arithmetic ─────────────────────────────────────────────────────

/** Add two decimal values. */
export function decimalAdd(a: DecimalString, b: DecimalString): DecimalString {
  return new Decimal(a).plus(new Decimal(b)).toFixed() as DecimalString
}

/** Subtract b from a. */
export function decimalSub(a: DecimalString, b: DecimalString): DecimalString {
  return new Decimal(a).minus(new Decimal(b)).toFixed() as DecimalString
}

/** Multiply two decimal values. */
export function decimalMul(a: DecimalString, b: DecimalString): DecimalString {
  return new Decimal(a).times(new Decimal(b)).toFixed() as DecimalString
}

/** Divide a by b. */
export function decimalDiv(a: DecimalString, b: DecimalString): DecimalString {
  return new Decimal(a).dividedBy(new Decimal(b)).toFixed() as DecimalString
}

/** Round to N decimal places (default 2 for currency). */
export function decimalRound(value: DecimalString, dp = 2): DecimalString {
  return new Decimal(value).toFixed(dp) as DecimalString
}

/** Compare: returns -1, 0, or 1. */
export function decimalCompare(a: DecimalString, b: DecimalString): number {
  return new Decimal(a).comparedTo(new Decimal(b))
}

/** Is the value zero? */
export function decimalIsZero(value: DecimalString): boolean {
  return new Decimal(value).isZero()
}

/** Negate the value. */
export function decimalNeg(value: DecimalString): DecimalString {
  return new Decimal(value).negated().toFixed() as DecimalString
}

/** Absolute value. */
export function decimalAbs(value: DecimalString): DecimalString {
  return new Decimal(value).abs().toFixed() as DecimalString
}

// ── Formatting ─────────────────────────────────────────────────────

/** Format a DecimalString as AUD currency for display. Uses Intl.NumberFormat
 *  which is acceptable for display per A-0048 §10 (display-only rounding). */
export function formatDecimal(amount: DecimalString, currency = "AUD"): string {
  // parseFloat is acceptable here — we're formatting for display only,
  // and the precision is preserved in the DecimalString for computation.
  const num = parseFloat(amount)
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(num)
}

/** Format without currency symbol (just the number with commas). */
export function formatDecimalNumber(amount: DecimalString, dp = 2): string {
  const num = parseFloat(amount)
  return new Intl.NumberFormat("en-AU", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  }).format(num)
}

// Re-export Decimal class for advanced usage.
export { Decimal }
