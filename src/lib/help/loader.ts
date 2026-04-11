import yaml from "js-yaml"
import type { HelpPage, Glossary, GlossaryTerm } from "./types"

// Import all help YAML files using Vite's glob import with ?raw.
const helpModules = import.meta.glob("/src/locales/en-AU/help/**/*.yaml", { query: "?raw", eager: true }) as Record<string, { default: string }>
const glossaryModule = import.meta.glob("/src/locales/en-AU/glossary.yaml", { query: "?raw", eager: true }) as Record<string, { default: string }>

/** All loaded help pages, keyed by page route. */
const helpRegistry = new Map<string, HelpPage>()

/** Sub-context help pages, keyed by "page::context". */
const contextRegistry = new Map<string, HelpPage>()

/** The glossary of terms. */
let glossary: Glossary = {}

// Parse and register all help files on module load.
for (const [path, mod] of Object.entries(helpModules)) {
  try {
    const parsed = yaml.load(mod.default) as HelpPage
    if (parsed?.page) {
      if (parsed.context) {
        contextRegistry.set(`${parsed.page}::${parsed.context}`, parsed)
      } else {
        helpRegistry.set(parsed.page, parsed)
      }
    }
  } catch (e) {
    console.warn(`Failed to parse help file ${path}:`, e)
  }
}

// Parse glossary.
for (const [, mod] of Object.entries(glossaryModule)) {
  try {
    glossary = (yaml.load(mod.default) as Glossary) ?? {}
  } catch (e) {
    console.warn("Failed to parse glossary:", e)
  }
}

/**
 * Get help content for a page route, optionally with a sub-context.
 * Falls back to the base page help if no context-specific help exists.
 */
export function getHelp(page: string, context?: string): HelpPage | null {
  if (context) {
    const contextHelp = contextRegistry.get(`${page}::${context}`)
    if (contextHelp) return contextHelp
  }
  return helpRegistry.get(page) ?? null
}

/** Get the full glossary. */
export function getGlossary(): Glossary {
  return glossary
}

/** Look up a single glossary term by key (case-insensitive). */
export function lookupTerm(key: string): GlossaryTerm | null {
  // Try exact match first, then case-insensitive.
  if (glossary[key]) return glossary[key]
  const lower = key.toLowerCase()
  for (const [k, v] of Object.entries(glossary)) {
    if (k.toLowerCase() === lower) return v
  }
  return null
}

/** Get all registered help pages (for debugging/auditing). */
export function getAllHelpPages(): HelpPage[] {
  return [...helpRegistry.values(), ...contextRegistry.values()]
}
