/** A single help page definition loaded from YAML. */
export interface HelpPage {
  page: string
  title: string
  context?: string
  sections: HelpSection[]
}

export interface HelpSection {
  heading?: string
  body: string
}

/** A glossary term definition. */
export interface GlossaryTerm {
  term: string
  full: string
  definition: string
}

/** The full glossary keyed by term ID. */
export type Glossary = Record<string, GlossaryTerm>
