import { Navigate } from "react-router-dom"
import { useAuth } from "@/shared/lib/auth"
import type { ReactNode } from "react"

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
