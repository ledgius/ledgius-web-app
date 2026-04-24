// Spec references: R-0008 §KNW-PIP-027, T-0039 KCR-004, KCR-083..KCR-085.
//
// Page-top InfoPanel widget. Reads the resolved internal-policy
// article's `info_panel` from the HelpPanel context and renders it as
// a compact "steps + quick links" card above the page's primary
// content. Suppressed globally when tenant.info_panels_enabled is
// false (a settings toggle — KCR-091).

import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { Info, X } from "lucide-react"
import { useState } from "react"
import { api } from "@/shared/lib/api"
import { useHelpPanel } from "@/components/workflow"
import type { ResolvedArticle, ResolvedInfoPanel } from "@/hooks/usePagePolicies"

interface BusinessSettings {
  info_panels_enabled?: boolean
}

/** Pick the first internal-policy article with an info_panel. */
function firstInfoPanelArticle(articles: ResolvedArticle[] | undefined): ResolvedArticle | undefined {
  if (!articles) return undefined
  return articles.find((a) => a.authority_type === "internal_policy" && a.info_panel !== undefined)
}

export function ArticleInfoPanel() {
  const { policies } = useHelpPanel()

  // Tenant's info_panels_enabled toggle. Default-on if the setting
  // isn't fetched yet or the endpoint isn't available — cheaper than
  // forcing every page through a loading state.
  const { data: settings } = useQuery<BusinessSettings>({
    queryKey: ["tenant-settings", "business"],
    queryFn: () => api.get<BusinessSettings>("/settings/business"),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
  const enabled = settings?.info_panels_enabled ?? true

  const article = firstInfoPanelArticle(policies?.articles)
  if (!article || !article.info_panel || !enabled) return null

  return <InfoPanelCard article={article} info={article.info_panel} />
}

function InfoPanelCard({ article, info }: { article: ResolvedArticle; info: ResolvedInfoPanel }) {
  // Dismissal is remembered per article id so the panel stays hidden
  // on that article but reappears elsewhere. Session-scoped — we don't
  // want a single dismissal to silence the panel forever.
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false
    return sessionStorage.getItem(`info-panel-dismissed-${article.id}`) === "true"
  })
  if (dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    try {
      sessionStorage.setItem(`info-panel-dismissed-${article.id}`, "true")
    } catch {
      // ignore — dismissal is UX nicety, not critical state
    }
  }

  return (
    <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
      <div className="flex items-start gap-3">
        <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-blue-900">{article.title} — quick steps</p>
          {info.steps.length > 0 && (
            <ol className="mt-1.5 list-decimal list-inside text-xs text-blue-700 space-y-1 marker:text-blue-500">
              {info.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          )}
          {info.quick_links && info.quick_links.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {info.quick_links.map((ql, i) => (
                <Link
                  key={i}
                  to={ql.route}
                  className="inline-flex items-center text-[11px] bg-white border border-blue-200 rounded-full px-2 py-0.5 text-blue-700 hover:bg-blue-100"
                >
                  {ql.label}
                </Link>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 p-0.5 rounded hover:bg-blue-100 text-blue-400 hover:text-blue-600"
          aria-label="Dismiss info panel"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
