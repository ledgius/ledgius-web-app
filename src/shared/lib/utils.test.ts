import { describe, it, expect } from "vitest"
import { formatCurrency, formatDate } from "./utils"

describe("formatCurrency", () => {
  it("formats AUD currency", () => {
    const result = formatCurrency(1234.56)
    expect(result).toContain("1,234.56")
  })

  it("handles zero", () => {
    const result = formatCurrency(0)
    expect(result).toContain("0.00")
  })

  it("handles string input", () => {
    const result = formatCurrency("999.99")
    expect(result).toContain("999.99")
  })
})

describe("formatDate", () => {
  it("formats date to AU format", () => {
    const result = formatDate("2026-01-15")
    expect(result).toMatch(/15/)
    expect(result).toMatch(/Jan/)
    expect(result).toMatch(/2026/)
  })
})
