# Ledgius Web App — Claude Code Project Guide

## Project Overview

React/TypeScript frontend for Ledgius, a modernised double-entry accounting and ERP system with Australian tax compliance.

- **Organisation**: `github.com/ledgius`
- **API**: `github.com/ledgius/ledgius-api`
- **Specs**: `github.com/ledgius/ledgius-specs`

## Tech Stack

- React 19, TypeScript, Vite
- Tailwind CSS v4
- TanStack Query (data fetching)
- React Router (routing)
- Lucide (icons)
- js-yaml (help system)
- modern-screenshot (feedback screenshots)

## Project Structure

```
src/
  domains/          — Domain pages mirroring Go backend (account, contact, journal, receivable, payable, banking, payroll, etc.)
  shared/           — Shared components (AppHeader, Layout, DataTable), API client, utilities
  components/       — Reusable UI components
    layout/         — PageShell, PageSection, TotalsCard, ActionBar
    primitives/     — Button, Badge, Combobox, Skeleton, InlineAlert
    financial/      — MoneyValue, DateValue, StatusStepper, FinancialGrid
    workflow/       — HelpPanel, AuditTimeline, EntityHeader, CommandPalette
    feedback/       — FeedbackConsole, NotificationProvider
  lib/
    help/           — YAML help loader, HelpMarkup renderer, glossary tooltips
    feedback/       — FeedbackPanel, FlowPulse, action trail, screenshot capture
  hooks/            — usePageHelp, usePagePolicies, useEscapeKey, useEntityActivity
  locales/en-AU/    — Help content YAML files, glossary
  assets/           — Logos, brand assets
public/             — Favicon, logos
```

## UX/UI Rules (Non-Negotiable)

All frontend implementation MUST follow these rules. Governed by **A-0014** in ledgius-specs (`../ledgius-specs/domains/architecture/ux-principles/A-0014.md`).

**Before starting any frontend work, read A-0014 end-to-end.** The summary below is a reminder, not a substitute. Sections 26b (Info Panel), 26c (Inline Feedback), 26d (Totals Row Styling), 27 (Inline Creation) contain rules that are easy to miss and non-negotiable.

### 1. Page Layout — Four-Zone Structure
App header, sidebar (navigation only), main content, help panel (collapsible).

### 2. Page Headers — Two-Line Pattern
Line 1: Title + contextual stats. Line 2: Action buttons (left-aligned) + search (right).

### 3. Button Placement
- Action buttons ALWAYS in the header area (below title), NEVER at bottom of forms
- ALWAYS visible — use `disabled` state, never hide/show
- The user should never scroll to find the primary action

### 4. Button Variants
- **Primary** (cyan): commit actions (Create, Save, Post, Submit)
- **Secondary** (outline): Cancel, Back, side triggers
- **Danger** (red): destructive ONLY (Delete, Reject)
- **Ghost** (transparent): low-emphasis toggles

### 5. Form Fields
- Editable: white bg, gray-300 border, cyan focus ring
- Read-only/computed: gray-100 bg, gray-500 text, no border
- Native `<select>`: add `pr-7` so the chevron doesn't overlap option text

### 5a. Totals Row on Line-Item Tables (A-0014 §26d)
- **No filled colour bar** for Subtotal / GST / Total rows — never `bg-gray-500 text-white` or similar
- Subtotal / GST: `text-xs uppercase tracking-wide text-gray-500` label, `text-sm text-gray-700 tabular-nums` value
- Total: `border-t-2 border-gray-300`, `text-sm font-semibold text-gray-600` label, `text-base font-bold text-gray-600 tabular-nums` value
- Labels: `Subtotal (ex GST)`, `GST`, `Total (inc GST)` — always qualify GST-inclusive/exclusive

### 5b. Info Panel + Inline Feedback (A-0014 §26b, §26c)
- Complex workflow pages MUST have an `InfoPanel` (dismissible, persisted via `storageKey`) explaining the flow
- Simple list pages (Accounts, Contacts) may skip it — but Invoices/Bills/Payments/Debit Notes/Receipts/Credit Notes SHOULD have one
- Blue (`bg-blue-50`) is reserved for info panels only — never for action feedback
- Action feedback uses light grey with a coloured left accent stripe (`border-l-[3px] border-l-green-400` for success, amber for warning, red for error)

### 5c. Every Page MUST Call `usePageHelp` + `usePagePolicies`
- `usePageHelp(pageHelpContent.<slug>)` — wires F1 help content
- `usePagePolicies([...domains])` — wires governing policies to the help panel
- Both are required — reviewers should reject PRs adding pages without them

### 6. Status-Driven Editing
- Draft: fully editable, Save/Discard in header
- Posted: read-only with corrective actions
- Paid/Locked: completely locked, view-only

### 7. List → Detail Navigation
Every entity: `/entity` (list), `/entity/new` (create), `/entity/:id` (detail with Activity section).

### 8. Help System
- F1 toggles help panel
- **Help + policy content is served by the knowledge pipeline API** per
  R-0008 §KNW-PIP-004 / §KNW-PIP-018 / §KNW-PIP-025 — articles live as
  YAML in `ledgius-api/docs/authority/articles/` (authored content under
  `articles/internal/`; ingested external authority under `articles/ato/`
  etc.), loaded at API boot, and served via `GET /api/v1/knowledge/
  articles?page=&domains=` with ETag + Cache-Control.
- **Do NOT add help YAML to `src/locales/en-AU/help/`** — that tier is
  being retired per T-0038. Pages that still have local YAML there
  (migration in progress) can keep theirs for now, but new pages must
  use internal-policy articles instead.
- Pages declare domain tags via `usePagePolicies(["domain1", "domain2"])`;
  the knowledge resolver returns matching articles (internal + external).
  The Help tab renders internal-policy articles; the Policies tab
  renders external authorities (colour-coded by type per §KNW-PIP-022).
- `{{term:AR}}` syntax for glossary tooltips
- `{{good:}}`, `{{warn:}}`, `{{bad:}}` for semantic markup
- Sub-context help is a legacy pattern on the local-YAML tier; new pages
  use a narrower domain tag or manifest override instead.

### 9. Feedback System
- F2 opens feedback panel
- Screenshot capture, action trail, console messages auto-attached
- FB-{id} reference numbers

### 10. Anti-Patterns (NEVER do these)
- Never push buttons to far right of screen
- Never put action buttons at bottom of form cards
- Never use black borders on inputs — always gray-300
- Never truncate error messages — show full detail
- Never show "Loading..." text — use Skeleton component
- Never show "No data" — guide user to next action
- Never instant-save on field change — accumulate, save on button click

## Code Conventions

- Domain folders mirror Go backend: `src/domains/{account,contact,...}`
- TanStack Query hooks per domain for data fetching
- Typed API client at `src/shared/lib/api.ts`
- Tailwind CSS for styling — never inline styles
- Australian locale formatting (DD/MM/YYYY, AUD currency)
- Use `MoneyValue` component for all currency display
- Use `DateValue` component for all date display
- Use `StatusPill` for status display
- Use `DataTable` with typed columns for all list pages

## Running Locally

```bash
npm install
npm run dev          # Vite dev server on http://localhost:3000

# Production build (strict TypeScript):
npm run build
```

## Pre-Commit Checks (MANDATORY)

Before committing ANY change to `.ts` or `.tsx` files, run both:

```bash
npx tsc -b           # Build-mode type check — matches production exactly
npx vite build       # Full production build — catches import/asset issues
```

Use `tsc -b` (not `tsc --noEmit`) — the production Dockerfile runs `tsc -b && vite build` and `tsc -b` is stricter (catches unused variables, unused imports). Never commit web app code without passing both checks.

### Feature branches: merge master before checking

When working on a feature branch, **merge master into the branch** before running the pre-commit checks. TypeScript errors often surface from the combination of two PRs that each pass individually but fail together (e.g. a function signature change in one PR + a call site in another). The check must run on the combined code, not just the branch's diff.

## Help Content

Help + policy content is served by the knowledge pipeline API per R-0008
§KNW-PIP-004 / §KNW-PIP-018 / §KNW-PIP-025 — migration in progress via
T-0038.

**Canonical home for new help content:**
`ledgius-api/docs/authority/articles/internal/ledgius-{domain}-{page}.yaml`

Article structure (authored):
```yaml
id: LEDGIUS-DOMAIN-PAGE           # Stable, uppercase, hyphenated
title: Page Title
jurisdiction: AU                  # AU | NZ | UK | ...
issuer: Ledgius
authority_type: internal_policy
effective:
  start: "2026-04-01"
review_date: "2027-04-01"
domains: [account, tax, assets]   # Match the page's usePagePolicies() call
sections:
  - id: what-is-this              # Stable, hyphenated, derived from heading
    heading: What is this?
    body: |
      Prose with {{term:glossary}}, {{good:highlights}}, {{warn:warnings}}.
```

The knowledge store loads everything under `docs/authority/articles/`
recursively at API boot. Reloads require an API restart (hot-reload not
yet implemented). Endpoints serve with ETag + Cache-Control; the frontend
uses `usePagePolicies(domains)` and the help panel picks up internal-
policy articles on the Help tab + external authorities on the Policies
tab automatically.

**Legacy local YAML under `src/locales/en-AU/help/`:**

Pre-T-0038 pages may still use the local YAML loader (`src/lib/help/
loader.ts`) or the `pageHelpContent` map in `src/hooks/usePageHelp.ts`.
These tiers are being retired — do NOT add new entries. Migrate legacy
content to knowledge articles when you touch a page substantially.

All features must have help content updated when UX behaviour changes —
but you update the knowledge article, not the frontend YAML.
