import { cva, type VariantProps } from "class-variance-authority"
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from "lucide-react"
import { cn } from "@/shared/lib/utils"

const alertVariants = cva(
  "flex items-start gap-3 rounded-md px-4 py-3 text-sm",
  {
    variants: {
      variant: {
        info: "bg-primary-50 text-primary-800",
        success: "bg-green-50 text-green-800",
        warning: "bg-amber-50 text-amber-800",
        error: "bg-red-50 text-red-800",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  }
)

const iconMap = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
} as const

export interface InlineAlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  /** Optional title rendered bold above the children */
  title?: string
  /** Callback to dismiss the alert */
  onDismiss?: () => void
}

export function InlineAlert({
  className,
  variant = "info",
  title,
  onDismiss,
  children,
  ...props
}: InlineAlertProps) {
  const Icon = iconMap[variant ?? "info"]

  return (
    <div className={cn(alertVariants({ variant }), className)} role="alert" {...props}>
      <Icon className="h-4 w-4 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        {title && <p className="font-medium">{title}</p>}
        <div className={title ? "mt-0.5" : ""}>{children}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded p-0.5 hover:opacity-70 transition-opacity"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
