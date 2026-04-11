/**
 * Lightweight action trail logger.
 * Records the last N user interactions (route changes, clicks, form submissions)
 * in a circular buffer. Attached to feedback submissions for STR context.
 */

export interface TrailEntry {
  type: "navigate" | "click" | "submit" | "error"
  label: string
  path?: string
  timestamp: string
}

const MAX_ENTRIES = 15
const trail: TrailEntry[] = []

function push(entry: Omit<TrailEntry, "timestamp">) {
  // Skip consecutive duplicate entries (e.g. React strict mode double-render).
  const last = trail[trail.length - 1]
  if (last && last.type === entry.type && last.label === entry.label) return

  trail.push({
    ...entry,
    timestamp: new Date().toISOString(),
  })
  if (trail.length > MAX_ENTRIES) {
    trail.shift()
  }
}

/** Record a route navigation. */
export function trailNavigate(path: string) {
  push({ type: "navigate", label: `Navigated to ${path}`, path })
}

/** Record a button/link click. */
export function trailClick(label: string) {
  push({ type: "click", label: `Clicked: ${label}` })
}

/** Record a form submission. */
export function trailSubmit(label: string) {
  push({ type: "submit", label: `Submitted: ${label}` })
}

/** Record an error. */
export function trailError(message: string) {
  push({ type: "error", label: `Error: ${message}` })
}

/** Get a snapshot of the current trail. */
export function getTrail(): TrailEntry[] {
  return [...trail]
}

/** Clear the trail (after feedback submission). */
export function clearTrail() {
  trail.length = 0
}

/**
 * Initialise global click listener for automatic trail capture.
 * Call once at app startup.
 */
export function initActionTrail() {
  // Capture meaningful clicks (buttons, links, interactive elements).
  // Excludes clicks inside the feedback panel itself.
  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement

    // Skip clicks inside the feedback panel or flow pulse.
    if (target.closest("[data-feedback-panel], [data-flow-pulse]")) return

    const button = target.closest("button, a, [role='button'], [data-trail]")
    if (!button) return

    const label =
      button.getAttribute("data-trail") ??
      button.getAttribute("aria-label") ??
      button.getAttribute("title") ??
      button.textContent?.trim().slice(0, 60) ??
      button.tagName

    if (label && label !== "") {
      trailClick(label)
    }
  }, { capture: true, passive: true })

  // Capture form submissions.
  document.addEventListener("submit", (e) => {
    const form = e.target as HTMLFormElement
    const label = form.getAttribute("data-trail") ?? form.getAttribute("name") ?? "form"
    trailSubmit(label)
  }, { capture: true, passive: true })
}
