// Spec references: T-0034-11.
//
// Undo toast stack — shows at bottom-right after approve actions.
// Auto-dismisses after 30s. Undo button reverts the action.

import { useEffect } from "react"
import { X, RotateCcw } from "lucide-react"

export interface UndoToast {
  id: number
  title: string
  detail?: string
  duration?: number
}

interface UndoToastStackProps {
  toasts: UndoToast[]
  onUndo: (id: number) => void
  onDismiss: (id: number) => void
}

export function UndoToastStack({ toasts, onUndo, onDismiss }: UndoToastStackProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onUndo={onUndo} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onUndo, onDismiss }: { toast: UndoToast; onUndo: (id: number) => void; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration ?? 30000)
    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onDismiss])

  return (
    <div className="pointer-events-auto bg-gray-900 text-white rounded-lg shadow-xl px-4 py-3 flex items-center gap-3 min-w-[300px] max-w-md animate-in slide-in-from-bottom-2 duration-200">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{toast.title}</p>
        {toast.detail && <p className="text-xs text-gray-400 mt-0.5">{toast.detail}</p>}
      </div>
      <button onClick={() => onUndo(toast.id)} className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 font-medium shrink-0">
        <RotateCcw className="h-3 w-3" />Undo
      </button>
      <button onClick={() => onDismiss(toast.id)} className="text-gray-500 hover:text-gray-300 shrink-0">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
