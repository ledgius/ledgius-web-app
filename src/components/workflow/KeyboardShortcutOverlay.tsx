import { X } from "lucide-react"

const isMac = typeof navigator !== "undefined" && navigator.platform.includes("Mac")
const mod = isMac ? "\u2318" : "Ctrl"

interface ShortcutGroup {
  title: string
  shortcuts: { keys: string; description: string }[]
}

const groups: ShortcutGroup[] = [
  {
    title: "Global",
    shortcuts: [
      { keys: `${mod}+K`, description: "Open command palette" },
      { keys: "/", description: "Open search" },
      { keys: "?", description: "Show keyboard shortcuts" },
    ],
  },
  {
    title: "Forms",
    shortcuts: [
      { keys: `${mod}+S`, description: "Save draft" },
      { keys: `${mod}+Enter`, description: "Post / Commit" },
      { keys: "Esc", description: "Cancel edit" },
    ],
  },
  {
    title: "Grids",
    shortcuts: [
      { keys: "\u2190\u2191\u2192\u2193", description: "Navigate cells" },
      { keys: "Enter", description: "Edit cell" },
      { keys: "Tab", description: "Next cell" },
      { keys: "Shift+Tab", description: "Previous cell" },
      { keys: "Esc", description: "Cancel cell edit" },
      { keys: `${mod}+Backspace`, description: "Delete row" },
    ],
  },
]

export interface KeyboardShortcutOverlayProps {
  open: boolean
  onClose: () => void
}

export function KeyboardShortcutOverlay({ open, onClose }: KeyboardShortcutOverlayProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-md">
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Keyboard Shortcuts</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto space-y-5">
            {groups.map((group) => (
              <div key={group.title}>
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  {group.title}
                </h3>
                <div className="space-y-1.5">
                  {group.shortcuts.map((s) => (
                    <div key={s.keys} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{s.description}</span>
                      <kbd className="inline-flex items-center rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-xs font-mono text-gray-500">
                        {s.keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
