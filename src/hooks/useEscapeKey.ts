import { useEffect } from "react"

/**
 * Calls the handler when the Escape key is pressed, unless the user
 * is focused on an input/textarea/select field.
 */
export function useEscapeKey(handler: () => void) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return
      const tag = document.activeElement?.tagName.toLowerCase()
      if (tag === "input" || tag === "textarea" || tag === "select") return
      e.preventDefault()
      handler()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [handler])
}
