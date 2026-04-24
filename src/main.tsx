import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AuthProvider } from "./shared/lib/auth"
import { ActivePeriodProvider } from "./shared/lib/active-period"
import { NotificationProvider, FeedbackProvider } from "./components/feedback"
import { HelpPanelProvider } from "./components/workflow"
import { router } from "./router"
import "./index.css"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ActivePeriodProvider>
          <NotificationProvider>
            <FeedbackProvider>
              <HelpPanelProvider>
                <RouterProvider router={router} />
              </HelpPanelProvider>
            </FeedbackProvider>
          </NotificationProvider>
        </ActivePeriodProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
)
