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
- YAML-based content in `locales/en-AU/help/`
- `{{term:AR}}` syntax for glossary tooltips
- `{{good:}}`, `{{warn:}}`, `{{bad:}}` for semantic markup
- Sub-context help (e.g. Data Import switches for MYOB/Xero)

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
npx tsc --noEmit     # Type check — catches strict-mode errors
npx vite build       # Full production build — catches import/asset issues
```

The production Dockerfile runs `tsc -b && vite build` — if either fails, the deploy fails. The Vite dev server is lenient and will NOT catch these errors. Never commit web app code without passing both checks.

## Help Content

Help YAML files live in `src/locales/en-AU/help/`. Each page has a YAML file with:
- `page:` — route path
- `title:` — help panel title
- `sections:` — array of heading + body with markup support

All features must have help content updated when UX behaviour changes.
