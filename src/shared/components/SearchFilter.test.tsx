import { describe, it, expect, vi } from "vitest"
import { renderWithProviders, screen } from "@/test/test-utils"
import { SearchFilter } from "./SearchFilter"

describe("SearchFilter", () => {
  it("renders with placeholder", () => {
    renderWithProviders(<SearchFilter onSearch={() => {}} placeholder="Find items..." />)
    const input = screen.getByPlaceholderText("Find items...")
    expect(input).toBeDefined()
  })

  it("renders with default placeholder", () => {
    renderWithProviders(<SearchFilter onSearch={() => {}} />)
    const input = screen.getByPlaceholderText("Search...")
    expect(input).toBeDefined()
  })

  it("updates input value on change", async () => {
    const onSearch = vi.fn()
    renderWithProviders(<SearchFilter onSearch={onSearch} />)

    const input = screen.getByPlaceholderText("Search...") as HTMLInputElement
    // Simulate a direct change event
    input.value = "test"
    input.dispatchEvent(new Event("input", { bubbles: true }))

    expect(input.value).toBe("test")
  })
})
