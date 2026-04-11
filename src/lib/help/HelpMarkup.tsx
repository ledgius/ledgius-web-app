import { type ReactNode, Fragment, useRef, useState } from "react"
import { lookupTerm } from "./loader"

/**
 * Renders help markup text into React elements.
 *
 * Supported syntax:
 *   **bold**          → <strong>
 *   *italic*          → <em>
 *   {{term:AR}}       → <Term> tooltip
 *   {{good:text}}     → green highlight
 *   {{warn:text}}     → amber highlight
 *   {{bad:text}}      → red highlight
 *   - item            → bullet list (at line start)
 */
export function HelpMarkup({ text }: { text: string }) {
  const lines = text.split("\n")
  const elements: ReactNode[] = []
  let listItems: string[] = []

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc list-outside ml-4 space-y-0.5">
          {listItems.map((item, i) => (
            <li key={i} className="text-sm text-gray-600 leading-relaxed">
              <InlineMarkup text={item} />
            </li>
          ))}
        </ul>
      )
      listItems = []
    }
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === "") {
      flushList()
      continue
    }

    // Bullet list item.
    if (trimmed.startsWith("- ")) {
      listItems.push(trimmed.slice(2))
      continue
    }

    // Regular paragraph.
    flushList()
    elements.push(
      <p key={`p-${elements.length}`} className="text-sm text-gray-600 leading-relaxed">
        <InlineMarkup text={trimmed} />
      </p>
    )
  }
  flushList()

  return <>{elements}</>
}

/**
 * Processes inline markup within a text string.
 * Handles **bold**, *italic*, {{term:...}}, {{good:...}}, {{warn:...}}, {{bad:...}}.
 */
function InlineMarkup({ text }: { text: string }) {
  const parts = parseInline(text)
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>{part}</Fragment>
      ))}
    </>
  )
}

function parseInline(text: string): ReactNode[] {
  const parts: ReactNode[] = []
  let remaining = text

  while (remaining.length > 0) {
    // Find the next special token.
    const patterns: { regex: RegExp; handler: (match: RegExpMatchArray) => ReactNode }[] = [
      // {{term:KEY}}
      {
        regex: /\{\{term:([^}]+)\}\}/,
        handler: (m) => <TermTooltip termKey={m[1]} />,
      },
      // {{good:text}}
      {
        regex: /\{\{good:([^}]+)\}\}/,
        handler: (m) => (
          <span className="text-green-700 bg-green-50 px-1 rounded text-xs font-medium">{m[1]}</span>
        ),
      },
      // {{warn:text}}
      {
        regex: /\{\{warn:([^}]+)\}\}/,
        handler: (m) => (
          <span className="text-amber-700 bg-amber-50 px-1 rounded text-xs font-medium">{m[1]}</span>
        ),
      },
      // {{bad:text}}
      {
        regex: /\{\{bad:([^}]+)\}\}/,
        handler: (m) => (
          <span className="text-red-700 bg-red-50 px-1 rounded text-xs font-medium">{m[1]}</span>
        ),
      },
      // **bold**
      {
        regex: /\*\*([^*]+)\*\*/,
        handler: (m) => <strong className="font-semibold text-gray-900">{m[1]}</strong>,
      },
      // *italic* (must come after **bold**)
      {
        regex: /\*([^*]+)\*/,
        handler: (m) => <em>{m[1]}</em>,
      },
    ]

    let earliestIndex = remaining.length
    let earliestMatch: RegExpMatchArray | null = null
    let earliestHandler: ((m: RegExpMatchArray) => ReactNode) | null = null

    for (const { regex, handler } of patterns) {
      const match = remaining.match(regex)
      if (match && match.index !== undefined && match.index < earliestIndex) {
        earliestIndex = match.index
        earliestMatch = match
        earliestHandler = handler
      }
    }

    if (!earliestMatch || !earliestHandler) {
      // No more tokens — push remaining text.
      if (remaining) parts.push(remaining)
      break
    }

    // Push text before the match.
    if (earliestIndex > 0) {
      parts.push(remaining.slice(0, earliestIndex))
    }

    // Push the rendered token.
    parts.push(earliestHandler(earliestMatch))

    // Advance past the match.
    remaining = remaining.slice(earliestIndex + earliestMatch[0].length)
  }

  return parts
}

/**
 * Renders a glossary term with a hover tooltip showing the full name and definition.
 */
function TermTooltip({ termKey }: { termKey: string }) {
  const term = lookupTerm(termKey)
  const ref = useRef<HTMLSpanElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  if (!term) {
    return <span>{termKey}</span>
  }

  const showTooltip = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setPos({
        top: rect.top - 8,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - 240)),
      })
    }
  }

  return (
    <span
      ref={ref}
      className="relative inline"
      onMouseEnter={showTooltip}
      onMouseLeave={() => setPos(null)}
    >
      <span className="border-b border-dotted border-primary-400 text-primary-700 cursor-help font-medium">
        {term.term}
      </span>
      {pos && (
        <span
          className="fixed z-[100] w-56 rounded-md bg-gray-900 text-white text-xs p-2.5 shadow-lg leading-relaxed"
          style={{ top: pos.top, left: pos.left, transform: "translateY(-100%)" }}
        >
          <span className="block font-semibold text-primary-300 mb-0.5">{term.full}</span>
          {term.definition}
        </span>
      )}
    </span>
  )
}
