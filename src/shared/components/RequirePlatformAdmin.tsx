// Spec references: R-0054, R-0040 (admin endpoints).
//
// Client-side guard for routes that should only be accessible to platform
// administrators. Backend endpoints under /api/v1/admin/* are also gated
// by middleware.RequirePlatformAdmin — this HOC just prevents non-admins
// reaching the page in the first place.

import { Navigate } from "react-router-dom"
import { useAuth } from "@/shared/lib/auth"
import type { ReactNode } from "react"

export function RequirePlatformAdmin({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  if (!user?.is_platform_admin) {
    // Non-admin reaching an /admin route — bounce to dashboard rather
    // than expose an error tile.
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
