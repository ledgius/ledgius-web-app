import { describe, it, expect, vi } from "vitest"
import { renderWithProviders, screen } from "@/test/test-utils"
import { DataTable } from "./DataTable"

describe("DataTable", () => {
  const columns = [
    { key: "name", header: "Name" },
    { key: "value", header: "Value" },
  ]

  const data = [
    { name: "Item A", value: "100" },
    { name: "Item B", value: "200" },
  ]

  it("renders headers and rows", () => {
    renderWithProviders(<DataTable columns={columns} data={data} />)

    expect(screen.getByText("Name")).toBeDefined()
    expect(screen.getByText("Value")).toBeDefined()
    expect(screen.getByText("Item A")).toBeDefined()
    expect(screen.getByText("Item B")).toBeDefined()
  })

  it("shows empty message when no data", () => {
    renderWithProviders(<DataTable columns={columns} data={[]} emptyMessage="Nothing here" />)

    expect(screen.getByText("Nothing here")).toBeDefined()
  })

  it("calls onRowClick when row is clicked", () => {
    const onClick = vi.fn()
    renderWithProviders(<DataTable columns={columns} data={data} onRowClick={onClick} />)

    screen.getByText("Item A").closest("tr")?.click()
    expect(onClick).toHaveBeenCalledWith(data[0])
  })

  it("renders custom column render functions", () => {
    const customColumns = [
      { key: "name", header: "Name" },
      {
        key: "value",
        header: "Value",
        render: (row: { value: string }) => <span data-testid="custom">{row.value}!</span>,
      },
    ]

    renderWithProviders(<DataTable columns={customColumns} data={data} />)

    const customs = screen.getAllByTestId("custom")
    expect(customs).toHaveLength(2)
    expect(customs[0].textContent).toBe("100!")
  })
})
