import { useRef, useEffect } from "react"
import { ChevronUp } from "lucide-react"
import { Button } from "@/components/primitives"
import { cn } from "@/shared/lib/utils"

interface InlineCreatePanelProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function InlineCreatePanel({ isOpen, onClose, title, children }: InlineCreatePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    // Focus first input when opened
    const timer = setTimeout(() => {
      const firstInput = panelRef.current?.querySelector<HTMLInputElement | HTMLSelectElement>(
        "input:not([type=hidden]), select, textarea"
      )
      firstInput?.focus()
    }, 100)

    return () => clearTimeout(timer)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      ref={panelRef}
      className={cn(
        "mb-4 border border-gray-200 rounded-lg bg-gray-50 overflow-hidden",
        "animate-in slide-in-from-top-2 duration-200"
      )}
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white">
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ChevronUp className="h-4 w-4" />
          Collapse
        </Button>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  )
}
