// Spec references: R-0008 §KNW-PIP-027, T-0039 KCR-030..KCR-033.
//
// ActivePeriod React context + hook.
//
// The active period is the FY quarter the user is currently viewing.
// It controls which quarter the knowledge resolver renders content
// for (BAS dates, upcoming payments, etc.) and feeds any page that
// cares about period-scoped reads (audit timeline, reconciliation).
//
// Persisted to localStorage so a reload keeps the user on the period
// they were auditing. Change invalidates the ["knowledge"] query
// keys so articles re-render against the new period.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { useQueryClient } from "@tanstack/react-query"

/** FY quarter identifier — "2026-Q1" encodes FY2026-27 Q1 (Jul-Sep 2026). */
export type Period = `${number}-Q${1 | 2 | 3 | 4}`

interface ActivePeriodContextValue {
  /** The currently-selected quarter, e.g. "2025-Q4". */
  period: Period
  /** The current-quarter sentinel — selector's forward arrow disables when equal. */
  currentPeriod: Period
  /** Labelled form for the top-nav selector, e.g. "Q3 FY 2025-26". */
  label: string
  /** True iff period === currentPeriod (used to disable the forward button). */
  isCurrent: boolean
  /** Move the active period one quarter earlier / later. Clamped at current. */
  shiftQuarter: (direction: -1 | 1) => void
  /** Set the active period explicitly. Rejects future periods. */
  setPeriod: (p: Period) => void
  /** Reset to the current quarter (server-clock-derived). */
  resetToCurrent: () => void
}

const STORAGE_KEY = "ledgius-active-period"

const ActivePeriodContext = createContext<ActivePeriodContextValue | null>(null)

// AU FY calendar — FY N-N+1 starts 1 Jul year N.
// Q1 = Jul-Sep (month 6-8), Q2 = Oct-Dec (9-11),
// Q3 = Jan-Mar (0-2),     Q4 = Apr-Jun (3-5).
function resolveCurrent(now: Date): Period {
  const m = now.getMonth()
  const y = now.getFullYear()
  if (m >= 6 && m <= 8) return `${y}-Q1` as Period
  if (m >= 9) return `${y}-Q2` as Period
  if (m <= 2) return `${y - 1}-Q3` as Period
  return `${y - 1}-Q4` as Period
}

function parsePeriod(p: string): { year: number; q: 1 | 2 | 3 | 4 } | null {
  const m = /^(\d{4})-Q([1-4])$/.exec(p)
  if (!m) return null
  return { year: parseInt(m[1], 10), q: parseInt(m[2], 10) as 1 | 2 | 3 | 4 }
}

function shiftPeriod(p: Period, direction: -1 | 1): Period {
  const parsed = parsePeriod(p)
  if (!parsed) return p
  let { year, q } = parsed
  q = (q + direction) as 1 | 2 | 3 | 4
  if (q < 1) {
    q = 4
    year -= 1
  } else if (q > 4) {
    q = 1
    year += 1
  }
  return `${year}-Q${q}` as Period
}

// Strict ordering: true iff a > b (later in time).
function periodGreaterThan(a: Period, b: Period): boolean {
  const pa = parsePeriod(a)
  const pb = parsePeriod(b)
  if (!pa || !pb) return false
  if (pa.year !== pb.year) return pa.year > pb.year
  return pa.q > pb.q
}

function periodLabel(p: Period): string {
  const parsed = parsePeriod(p)
  if (!parsed) return p
  const short = (parsed.year + 1) % 100
  return `Q${parsed.q} FY ${parsed.year}-${String(short).padStart(2, "0")}`
}

function readStoredPeriod(): Period | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    if (parsePeriod(raw)) return raw as Period
  } catch {
    // localStorage may be unavailable (SSR, private browsing in some
    // environments). Silent fail — fall back to current quarter.
  }
  return null
}

function writeStoredPeriod(p: Period) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, p)
  } catch {
    // ignore
  }
}

export function ActivePeriodProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const now = useMemo(() => new Date(), [])
  const curr = useMemo(() => resolveCurrent(now), [now])

  const [period, setPeriodState] = useState<Period>(() => {
    const stored = readStoredPeriod()
    // Reject stored future values (e.g. suite clock rolled back since
    // last session) — fall back to current.
    if (stored && !periodGreaterThan(stored, curr)) return stored
    return curr
  })

  // Invalidate knowledge queries when the period changes so the
  // resolver re-fetches with the new ?period= param.
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["knowledge"] })
  }, [period, queryClient])

  const setPeriod = useCallback(
    (p: Period) => {
      if (periodGreaterThan(p, curr)) return // future rejected
      setPeriodState(p)
      writeStoredPeriod(p)
    },
    [curr],
  )

  const shiftQuarter = useCallback(
    (direction: -1 | 1) => {
      const next = shiftPeriod(period, direction)
      if (direction === 1 && periodGreaterThan(next, curr)) return
      setPeriodState(next)
      writeStoredPeriod(next)
    },
    [period, curr],
  )

  const resetToCurrent = useCallback(() => {
    setPeriodState(curr)
    writeStoredPeriod(curr)
  }, [curr])

  const value: ActivePeriodContextValue = {
    period,
    currentPeriod: curr,
    label: periodLabel(period),
    isCurrent: period === curr,
    shiftQuarter,
    setPeriod,
    resetToCurrent,
  }

  return <ActivePeriodContext.Provider value={value}>{children}</ActivePeriodContext.Provider>
}

export function useActivePeriod(): ActivePeriodContextValue {
  const ctx = useContext(ActivePeriodContext)
  if (!ctx) {
    throw new Error("useActivePeriod must be used inside ActivePeriodProvider")
  }
  return ctx
}

// Small convenience for components that only need the string and
// aren't inside an ActivePeriodProvider (e.g. a test render).
export function useActivePeriodOrDefault(): Period {
  const ctx = useContext(ActivePeriodContext)
  return ctx ? ctx.period : resolveCurrent(new Date())
}
