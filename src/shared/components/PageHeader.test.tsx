import { describe, it, expect } from "vitest"
import { renderWithProviders, screen } from "@/test/test-utils"
import { PageHeader } from "./PageHeader"

describe("PageHeader", () => {
  it("renders title", () => {
    renderWithProviders(<PageHeader title="Test Page" />)
    expect(screen.getByText("Test Page")).toBeDefined()
  })

  it("renders description", () => {
    renderWithProviders(<PageHeader title="Title" description="Some description" />)
    expect(screen.getByText("Some description")).toBeDefined()
  })

  it("renders action buttons", () => {
    renderWithProviders(
      <PageHeader title="Title" actions={<button>Click Me</button>} />
    )
    expect(screen.getByText("Click Me")).toBeDefined()
  })
})
