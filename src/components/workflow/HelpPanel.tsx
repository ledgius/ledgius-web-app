import {
  createContext, useCallback, useContext, useEffect,
  useMemo, useRef, useState, type ReactNode, type MouseEvent as ReactMouseEvent,
} from "react"
import {
  X, HelpCircle, ChevronDown, ChevronRight, ExternalLink,
  PanelRight, PanelLeft, Move,
} from "lucide-react"
import type { ResolvedPage, ResolvedArticle, ResolvedSection, PublicRule } from "@/hooks/usePagePolicies"
import { HelpMarkup } from "@/lib/help"

type HelpTab = "help" | "policies"
type DockPosition = "right" | "left" | "float"

const DOCK_STORAGE_KEY = "ledgius-help-dock"
const FLOAT_POS_KEY = "ledgius-help-float-pos"
const WIDTH_STORAGE_KEY = "ledgius-help-width"

const MIN_WIDTH = 240
const MAX_WIDTH = 480
const DEFAULT_WIDTH = 256

function loadDockPosition(): DockPosition {
  const stored = localStorage.getItem(DOCK_STORAGE_KEY)
  if (stored === "left" || stored === "right" || stored === "float") return stored
  return "right"
}

function loadFloatPosition(): { x: number; y: number } {
  try {
    const stored = localStorage.getItem(FLOAT_POS_KEY)
    if (stored) {
      const pos = JSON.parse(stored)
      if (typeof pos.x === "number" && typeof pos.y === "number") return pos
    }
  } catch { /* ignore */ }
  return { x: Math.max(100, window.innerWidth - 340), y: 80 }
}

interface HelpContent {
  readonly title: string
  readonly sections: readonly {
    readonly heading?: string
    readonly body: string
  }[]
}

interface HelpPanelState {
  isOpen: boolean
  activeTab: HelpTab
  content: HelpContent | null
  policies: ResolvedPage | null
  dockPosition: DockPosition
  panelWidth: number
  setContent: (content: HelpContent | null) => void
  setPolicies: (policies: ResolvedPage | null) => void
  toggle: () => void
  setActiveTab: (tab: HelpTab) => void
  setDockPosition: (pos: DockPosition) => void
  setPanelWidth: (w: number) => void
}

const HelpPanelContext = createContext<HelpPanelState | null>(null)

export function HelpPanelProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<HelpTab>("help")
  const [content, setContent] = useState<HelpContent | null>(null)
  const [policies, setPolicies] = useState<ResolvedPage | null>(null)
  const [dockPosition, setDockPositionState] = useState<DockPosition>(loadDockPosition)
  const [panelWidth, setPanelWidthState] = useState(() => {
    const stored = localStorage.getItem(WIDTH_STORAGE_KEY)
    return stored ? Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Number(stored))) : DEFAULT_WIDTH
  })

  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])

  // F1 key toggles the help panel.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F1") {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])
  const setDockPosition = useCallback((pos: DockPosition) => {
    setDockPositionState(pos)
    localStorage.setItem(DOCK_STORAGE_KEY, pos)
  }, [])
  const setPanelWidth = useCallback((w: number) => {
    const clamped = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, w))
    setPanelWidthState(clamped)
    localStorage.setItem(WIDTH_STORAGE_KEY, String(clamped))
  }, [])

  const value = useMemo(
    () => ({
      isOpen, activeTab, content, policies, dockPosition, panelWidth,
      setContent, setPolicies, toggle, setActiveTab, setDockPosition, setPanelWidth,
    }),
    [isOpen, activeTab, content, policies, dockPosition, panelWidth, toggle, setDockPosition, setPanelWidth]
  )

  return (
    <HelpPanelContext.Provider value={value}>
      {children}
    </HelpPanelContext.Provider>
  )
}

export function useHelpPanel() {
  const ctx = useContext(HelpPanelContext)
  if (!ctx) throw new Error("useHelpPanel must be used within HelpPanelProvider")
  return ctx
}

export function useHelpPanelToggle() {
  const ctx = useContext(HelpPanelContext)
  return {
    toggle: ctx?.toggle ?? (() => {}),
    isOpen: ctx?.isOpen ?? false,
  }
}

// ── Authority badge colours by type ──

const badgeStyles: Record<string, string> = {
  external_regulatory: "bg-blue-100 text-blue-700",
  external_standard: "bg-purple-100 text-purple-700",
  industry_practice: "bg-green-100 text-green-700",
  internal_policy: "bg-gray-100 text-gray-600",
}

function AuthorityBadge({ type, issuer }: { type: string; issuer: string }) {
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap ${badgeStyles[type] ?? "bg-gray-100 text-gray-500"}`}>
      {issuer}
    </span>
  )
}

// ── Collapsible section for policy articles ──

function CollapsibleSection({ section }: { section: ResolvedSection }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-l-2 border-gray-200 pl-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 w-full text-left group"
      >
        {open
          ? <ChevronDown className="h-3 w-3 text-gray-400 shrink-0" />
          : <ChevronRight className="h-3 w-3 text-gray-400 shrink-0" />
        }
        <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900">
          {section.heading}
        </span>
      </button>
      {open && (
        <div className="mt-1.5 ml-4">
          <div className="text-xs text-gray-600 leading-relaxed">
            <HelpMarkup text={section.body.trim()} />
          </div>
          {section.implemented_by.length > 0 && (
            <p className="text-[10px] text-gray-400 mt-1.5">
              Enforced by: {section.implemented_by.map((r: PublicRule) =>
                `${r.type}/${r.name}`
              ).join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Single article card ──

function PolicyArticle({ article }: { article: ResolvedArticle }) {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <h4 className="text-xs font-semibold text-gray-800 flex-1 leading-tight">
          {article.title}
        </h4>
        <AuthorityBadge type={article.authority_type} issuer={article.issuer} />
      </div>
      <p className="text-[10px] text-gray-400">
        Effective: {article.effective.start}
        {article.effective.end ? ` – ${article.effective.end}` : " – ongoing"}
        {article.source_url && (
          <>
            {" · "}
            <a
              href={article.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:underline inline-flex items-center gap-0.5"
            >
              Source <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </>
        )}
      </p>
      <div className="space-y-1.5">
        {article.sections.map((sec) => (
          <CollapsibleSection key={sec.id} section={sec} />
        ))}
      </div>
    </div>
  )
}

// ── Tab bar ──

function TabBar({ active, onChange, policyCount }: {
  active: HelpTab
  onChange: (tab: HelpTab) => void
  policyCount: number
}) {
  return (
    <div className="flex border-b border-gray-200">
      <button
        type="button"
        onClick={() => onChange("help")}
        className={`flex-1 text-xs font-medium py-2 text-center border-b-2 transition-colors ${
          active === "help"
            ? "border-primary-500 text-primary-700"
            : "border-transparent text-gray-500 hover:text-gray-700"
        }`}
      >
        Help
      </button>
      <button
        type="button"
        onClick={() => onChange("policies")}
        className={`flex-1 text-xs font-medium py-2 text-center border-b-2 transition-colors ${
          active === "policies"
            ? "border-primary-500 text-primary-700"
            : "border-transparent text-gray-500 hover:text-gray-700"
        }`}
      >
        Policies
        {policyCount > 0 && (
          <span className="ml-1 text-[10px] bg-gray-100 text-gray-600 px-1.5 rounded-full">
            {policyCount}
          </span>
        )}
      </button>
    </div>
  )
}

// ── Dock position switcher ──

function DockSwitcher({ current, onChange }: {
  current: DockPosition
  onChange: (pos: DockPosition) => void
}) {
  const options: { pos: DockPosition; icon: typeof PanelRight; title: string }[] = [
    { pos: "left", icon: PanelLeft, title: "Dock left" },
    { pos: "float", icon: Move, title: "Float" },
    { pos: "right", icon: PanelRight, title: "Dock right" },
  ]
  return (
    <div className="flex items-center gap-0.5">
      {options.map(({ pos, icon: Icon, title }) => (
        <button
          key={pos}
          type="button"
          onClick={() => onChange(pos)}
          title={title}
          className={`rounded p-1 transition-colors ${
            current === pos
              ? "bg-primary-50 text-primary-600"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  )
}

// ── Help content panel ──
//
// Content resolution order (per T-0038 §KHM-015..§KHM-017):
//   1. If `content` is set (legacy `usePageHelp(pageHelpContent.xxx)` or
//      local YAML), render that. Kept working for the ~40 pages still on
//      the legacy pattern.
//   2. Otherwise, render any internal-policy articles from the resolved
//      page payload — these are the API-served Ledgius help articles.
//   3. Otherwise, render the empty-state prompt.
//
// External-authority articles (ATO, AASB, etc.) never appear on the Help
// tab — they're the Policies tab's job so users can distinguish Ledgius
// guidance from regulatory source material at a glance.

function HelpContentPanel({
  content,
  policies,
}: {
  content: HelpPanelState["content"]
  policies: ResolvedPage | null
}) {
  if (content) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">{content.title}</h3>
        <div className="space-y-4">
          {content.sections.map((section, i) => (
            <div key={i}>
              {section.heading && (
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  {section.heading}
                </h4>
              )}
              <HelpMarkup text={section.body} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const internalArticles = (policies?.articles ?? []).filter(
    (a) => a.authority_type === "internal_policy",
  )
  if (internalArticles.length > 0) {
    return (
      <div className="space-y-5">
        {internalArticles.map((article) => (
          <div key={article.id}>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">{article.title}</h3>
            <div className="space-y-4">
              {article.sections.map((sec) => (
                <div key={sec.id}>
                  {sec.heading && (
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      {sec.heading}
                    </h4>
                  )}
                  <HelpMarkup text={sec.body} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="text-sm text-gray-400 text-center py-8">
      No help available for this page. Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">F1</kbd> to toggle.
    </div>
  )
}

// ── Policies content panel ──
//
// Renders external-authority articles only — internal-policy articles
// appear on the Help tab so the two tabs serve distinct purposes.

function PoliciesContent({ policies }: { policies: ResolvedPage | null }) {
  const external = (policies?.articles ?? []).filter(
    (a) => a.authority_type !== "internal_policy",
  )
  if (external.length === 0) {
    return (
      <div className="text-sm text-gray-400 text-center py-8">
        No external policies apply to this page.
      </div>
    )
  }
  return (
    <div className="space-y-5">
      {external.map((article) => (
        <PolicyArticle key={article.id} article={article} />
      ))}
    </div>
  )
}

// ── Shared panel inner content ──

function PanelInner({ ctx, policyCount }: { ctx: HelpPanelState; policyCount: number }) {
  return (
    <>
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-primary-500" />
          <h2 className="text-sm font-semibold text-gray-900">Help</h2>
        </div>
        <div className="flex items-center gap-1">
          <DockSwitcher current={ctx.dockPosition} onChange={ctx.setDockPosition} />
          <button
            type="button"
            onClick={ctx.toggle}
            className="rounded p-1 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close help panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <TabBar
        active={ctx.activeTab}
        onChange={ctx.setActiveTab}
        policyCount={policyCount}
      />

      <div className="flex-1 overflow-y-auto p-4">
        {ctx.activeTab === "help" ? (
          <HelpContentPanel content={ctx.content} policies={ctx.policies} />
        ) : (
          <PoliciesContent policies={ctx.policies} />
        )}
      </div>
    </>
  )
}

// ── Resize handle (vertical drag edge) ──

function ResizeHandle({ side, onResize }: { side: "left" | "right"; onResize: (delta: number) => void }) {
  const onMouseDown = (e: ReactMouseEvent) => {
    e.preventDefault()
    const startX = e.clientX

    const onMouseMove = (ev: globalThis.MouseEvent) => {
      const delta = side === "left"
        ? startX - ev.clientX  // dragging left border leftward = wider
        : ev.clientX - startX  // dragging right border rightward = wider
      onResize(delta)
    }

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("mouseup", onMouseUp)
    }

    document.addEventListener("mousemove", onMouseMove)
    document.addEventListener("mouseup", onMouseUp)
  }

  return (
    <div
      onMouseDown={onMouseDown}
      className={`absolute top-0 ${side === "left" ? "left-0 -ml-1" : "right-0 -mr-1"} w-2 h-full cursor-col-resize z-10 hover:bg-primary-200/30 transition-colors`}
    />
  )
}

// ── Floating (draggable) panel ──

function FloatingPanel({ ctx, policyCount }: { ctx: HelpPanelState; policyCount: number }) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState(loadFloatPosition)
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)

  // Persist position on change.
  useEffect(() => {
    localStorage.setItem(FLOAT_POS_KEY, JSON.stringify(pos))
  }, [pos])

  const onMouseDown = (e: ReactMouseEvent) => {
    // Only drag from the header area.
    if ((e.target as HTMLElement).closest("button")) return
    e.preventDefault()
    dragState.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y }

    const onMouseMove = (ev: globalThis.MouseEvent) => {
      if (!dragState.current) return
      const dx = ev.clientX - dragState.current.startX
      const dy = ev.clientY - dragState.current.startY
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 280, dragState.current.origX + dx)),
        y: Math.max(0, Math.min(window.innerHeight - 100, dragState.current.origY + dy)),
      })
    }

    const onMouseUp = () => {
      dragState.current = null
      document.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("mouseup", onMouseUp)
    }

    document.addEventListener("mousemove", onMouseMove)
    document.addEventListener("mouseup", onMouseUp)
  }

  const baseWidth = ctx.panelWidth

  return (
    <div
      ref={panelRef}
      style={{ left: pos.x, top: pos.y, width: baseWidth + 32 }}
      className="fixed z-50 max-h-[80vh] bg-white border border-gray-200 rounded-lg shadow-xl flex flex-col relative"
    >
      <ResizeHandle side="right" onResize={(delta) => ctx.setPanelWidth(baseWidth + delta)} />
      {/* Drag handle */}
      <div onMouseDown={onMouseDown} className="cursor-move">
        <PanelInner ctx={ctx} policyCount={policyCount} />
      </div>
    </div>
  )
}

// ── Docked panel (left or right) ──

function DockedPanel({ ctx, policyCount }: { ctx: HelpPanelState; policyCount: number }) {
  const isLeft = ctx.dockPosition === "left"
  const borderClass = isLeft ? "border-r" : "border-l"
  const resizeSide = isLeft ? "right" : "left"
  const baseWidth = ctx.panelWidth

  return (
    <aside
      style={{ width: baseWidth }}
      className={`${borderClass} border-gray-200 bg-white flex flex-col shrink-0 relative`}
    >
      <ResizeHandle side={resizeSide} onResize={(delta) => ctx.setPanelWidth(baseWidth + delta)} />
      <PanelInner ctx={ctx} policyCount={policyCount} />
    </aside>
  )
}

/**
 * The sidebar UI component. Rendered in Layout.
 * - Docked left/right: renders inline as a flex column sibling.
 * - Floating: renders as a fixed overlay.
 */
export function HelpPanelSidebar() {
  const ctx = useContext(HelpPanelContext)

  if (!ctx || !ctx.isOpen) return null

  // Policies tab badge counts external authorities only — internal-policy
  // articles surface on the Help tab instead (per T-0038 §KHM-017).
  const policyCount = (ctx.policies?.articles ?? []).filter(
    (a) => a.authority_type !== "internal_policy",
  ).length

  if (ctx.dockPosition === "float") {
    return <FloatingPanel ctx={ctx} policyCount={policyCount} />
  }

  return <DockedPanel ctx={ctx} policyCount={policyCount} />
}

/**
 * Returns the current dock position for Layout to decide placement.
 */
export function useHelpDockPosition(): DockPosition {
  const ctx = useContext(HelpPanelContext)
  return ctx?.dockPosition ?? "right"
}
