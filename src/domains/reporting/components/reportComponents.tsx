// Spec references: R-0071 (RT-002, RT-003, RT-005), A-0042.
//
// Puck report components — the building blocks for the visual template editor.
// Each component renders in the editor canvas AND in the final HTML output.

// Component render props mirror what the server-side renderer produces,
// so WYSIWYG preview matches the final output.
//
// Puck wraps render props with WithPuckProps which adds `id` and `puck`
// to the prop type. We type render functions with explicit props and
// let the Config cast handle the Puck wrapper types.

/* eslint-disable @typescript-eslint/no-explicit-any */

const TextField = {
  label: "Text",
  fields: {
    content: { type: "textarea" as const, label: "Content" },
    fontSize: { type: "number" as const, label: "Font Size (pt)", min: 6, max: 48 },
    fontWeight: { type: "select" as const, label: "Weight", options: [
      { label: "Normal", value: "normal" }, { label: "Bold", value: "bold" },
    ]},
    alignment: { type: "select" as const, label: "Alignment", options: [
      { label: "Left", value: "left" }, { label: "Centre", value: "center" }, { label: "Right", value: "right" },
    ]},
  },
  defaultProps: { content: "Enter text here", fontSize: 11, fontWeight: "normal", alignment: "left" },
  render: ({ content, fontSize, fontWeight, alignment }: { content: string; fontSize: number; fontWeight: string; alignment: string }) => (
    <p style={{ fontSize: `${fontSize}pt`, fontWeight: fontWeight as "normal" | "bold", textAlign: alignment as "left" | "center" | "right", margin: "4px 0" }}>
      {content}
    </p>
  ),
}

const DataField = {
  label: "Data Field",
  fields: {
    fieldSlug: { type: "text" as const, label: "Field Slug" },
    label: { type: "text" as const, label: "Label (optional)" },
    format: { type: "select" as const, label: "Format", options: [
      { label: "Text", value: "text" }, { label: "Currency", value: "currency" },
      { label: "Date", value: "date" }, { label: "Number", value: "number" },
    ]},
    fontSize: { type: "number" as const, label: "Font Size (pt)", min: 6, max: 48 },
    fontWeight: { type: "select" as const, label: "Weight", options: [
      { label: "Normal", value: "normal" }, { label: "Bold", value: "bold" },
    ]},
  },
  defaultProps: { fieldSlug: "", label: "", format: "text", fontSize: 11, fontWeight: "normal" },
  render: ({ fieldSlug, label, format, fontSize, fontWeight }: { fieldSlug: string; label: string; format: string; fontSize: number; fontWeight: string }) => (
    <div style={{ fontSize: `${fontSize}pt`, fontWeight: fontWeight as "normal" | "bold", margin: "4px 0" }}>
      {label && <span style={{ color: "#64748b", fontSize: "9pt", marginRight: 4 }}>{label}:</span>}
      <span style={{ color: "#2563EB", fontFamily: "monospace", background: "#eff6ff", padding: "1px 4px", borderRadius: 3 }}>
        {`{{${fieldSlug}}}`}{format !== "text" && <span style={{ color: "#94a3b8", fontSize: "8pt", marginLeft: 2 }}>({format})</span>}
      </span>
    </div>
  ),
}

const DataTable = {
  label: "Data Table",
  fields: {
    dataField: { type: "text" as const, label: "List Field Slug" },
    columns: { type: "textarea" as const, label: "Columns (JSON)" },
  },
  defaultProps: {
    dataField: "line_items",
    columns: JSON.stringify([
      { header: "Description", field: "description" },
      { header: "Amount", field: "amount", format: "currency", align: "right" },
    ], null, 2),
  },
  render: ({ dataField, columns: columnsStr }: { dataField: string; columns: string }) => {
    let columns: Array<{ header: string; field: string; align?: string }> = []
    try { columns = JSON.parse(columnsStr) } catch { /* ignore */ }
    return (
      <div style={{ margin: "8px 0" }}>
        <div style={{ fontSize: "8pt", color: "#94a3b8", marginBottom: 4 }}>Table: {`{{${dataField}}}`}</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10pt" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
              {columns.map((col, i) => (
                <th key={i} style={{ textAlign: (col.align as "left" | "right") || "left", padding: "6px 8px", fontSize: "9pt", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3].map(row => (
              <tr key={row} style={{ borderBottom: "1px solid #f1f5f9", background: row % 2 === 0 ? "#f8fafc" : "transparent" }}>
                {columns.map((col, i) => (
                  <td key={i} style={{ padding: "5px 8px", textAlign: (col.align as "left" | "right") || "left", color: "#94a3b8", fontStyle: "italic" }}>
                    {`{${col.field}}`}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  },
}

const Logo = {
  label: "Logo",
  fields: {
    source: { type: "select" as const, label: "Source", options: [
      { label: "Tenant Logo", value: "tenant" }, { label: "Custom URL", value: "custom" },
    ]},
    customUrl: { type: "text" as const, label: "Custom URL (if source=custom)" },
    maxHeight: { type: "number" as const, label: "Max Height (px)", min: 16, max: 200 },
  },
  defaultProps: { source: "tenant", customUrl: "", maxHeight: 48 },
  render: ({ source, maxHeight }: { source: string; customUrl: string; maxHeight: number }) => (
    <div style={{ margin: "4px 0" }}>
      <div style={{ width: maxHeight * 3, height: maxHeight, background: "#f1f5f9", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: "9pt" }}>
        {source === "tenant" ? "{{business_logo}}" : "Custom Logo"}
      </div>
    </div>
  ),
}

const PageHeader = {
  label: "Page Header",
  fields: {},
  defaultProps: {},
  render: () => (
    <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: 12, marginBottom: 16 }}>
      <div style={{ fontSize: "8pt", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em" }}>Page Header</div>
    </div>
  ),
}

const PageFooter = {
  label: "Page Footer",
  fields: {
    showPageNumbers: { type: "radio" as const, label: "Page Numbers", options: [
      { label: "Show", value: "true" }, { label: "Hide", value: "false" },
    ]},
  },
  defaultProps: { showPageNumbers: "true" },
  render: ({ showPageNumbers }: { showPageNumbers: string }) => (
    <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 8, marginTop: 16, fontSize: "8pt", color: "#94a3b8", display: "flex", justifyContent: "space-between" }}>
      <span>{"{{business_name}}"}</span>
      {showPageNumbers === "true" && <span>Page X of Y</span>}
    </div>
  ),
}

const HorizontalRule = {
  label: "Horizontal Rule",
  fields: {
    style: { type: "select" as const, label: "Style", options: [
      { label: "Light", value: "light" }, { label: "Medium", value: "medium" }, { label: "Heavy", value: "heavy" },
    ]},
  },
  defaultProps: { style: "light" },
  render: ({ style }: { style: string }) => (
    <hr style={{ border: "none", borderTop: `${style === "heavy" ? 3 : style === "medium" ? 2 : 1}px solid ${style === "heavy" ? "#334155" : "#e2e8f0"}`, margin: "12px 0" }} />
  ),
}

const Spacer = {
  label: "Spacer",
  fields: {
    height: { type: "number" as const, label: "Height (px)", min: 4, max: 200 },
  },
  defaultProps: { height: 16 },
  render: ({ height }: { height: number }) => (
    <div style={{ height, background: "repeating-linear-gradient(45deg, transparent, transparent 5px, #f8fafc 5px, #f8fafc 10px)" }} />
  ),
}

const SubtotalRow = {
  label: "Subtotal / Total",
  fields: {
    label: { type: "text" as const, label: "Label" },
    field: { type: "text" as const, label: "Field Slug" },
    format: { type: "select" as const, label: "Format", options: [
      { label: "Currency", value: "currency" }, { label: "Number", value: "number" },
    ]},
    isTotal: { type: "radio" as const, label: "Style", options: [
      { label: "Subtotal", value: "false" }, { label: "Total (bold)", value: "true" },
    ]},
  },
  defaultProps: { label: "Total", field: "total", format: "currency", isTotal: "true" },
  render: ({ label, field, isTotal }: { label: string; field: string; format: string; isTotal: string }) => (
    <div style={{
      display: "flex", justifyContent: "space-between", padding: "6px 8px",
      borderTop: isTotal === "true" ? "2px solid #334155" : "1px solid #e2e8f0",
      fontWeight: isTotal === "true" ? 700 : 600,
      fontSize: isTotal === "true" ? "11pt" : "10pt",
      margin: "4px 0",
    }}>
      <span>{label}</span>
      <span style={{ fontFamily: "monospace", color: "#2563EB" }}>{`{{${field}}}`}</span>
    </div>
  ),
}

const DateField = {
  label: "Date",
  fields: {
    source: { type: "select" as const, label: "Source", options: [
      { label: "Current Date", value: "now" }, { label: "Data Field", value: "field" },
    ]},
    fieldSlug: { type: "text" as const, label: "Field Slug (if source=field)" },
    dateFormat: { type: "select" as const, label: "Format", options: [
      { label: "DD/MM/YYYY", value: "dd/mm/yyyy" }, { label: "D Month YYYY", value: "d-month-yyyy" },
    ]},
  },
  defaultProps: { source: "now", fieldSlug: "", dateFormat: "dd/mm/yyyy" },
  render: ({ source, fieldSlug }: { source: string; fieldSlug: string; dateFormat: string }) => (
    <span style={{ fontSize: "10pt" }}>
      {source === "now" ? new Date().toLocaleDateString("en-AU") : <span style={{ color: "#2563EB", fontFamily: "monospace" }}>{`{{${fieldSlug}}}`}</span>}
    </span>
  ),
}

const PageNumber = {
  label: "Page Number",
  fields: {},
  defaultProps: {},
  render: () => (
    <span style={{ fontSize: "8pt", color: "#94a3b8" }}>Page X of Y</span>
  ),
}

// Puck configuration — all report components.
// Cast to Config with `as any` on components to satisfy Puck's
// WithPuckProps wrapper types. The render functions receive our
// explicit prop types at runtime; the Puck framework injects
// additional props (id, puck) that we don't use.
export const reportPuckConfig = {
  components: {
    TextField,
    DataField,
    DataTable,
    Logo,
    PageHeader,
    PageFooter,
    HorizontalRule,
    Spacer,
    SubtotalRow,
    DateField,
    PageNumber,
  },
}
