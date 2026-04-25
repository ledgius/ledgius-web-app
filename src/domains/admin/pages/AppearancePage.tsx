// Theme/Appearance settings — enable background themes, select images.

import { PageShell } from "@/components/layout"
import { InfoPanel } from "@/components/primitives"
import { usePageHelp } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { useTheme, THEME_BACKGROUNDS } from "@/hooks/useTheme"
import { cn } from "@/shared/lib/utils"
import { Check, Sun, Moon, Image, X } from "lucide-react"

export function AppearancePage() {
  usePageHelp(undefined)
  usePagePolicies(["settings"])
  const { theme, setTheme, isThemeActive } = useTheme()

  const header = (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Appearance</h1>
      <p className="text-sm text-gray-500">Personalise the look and feel of your workspace</p>
    </div>
  )

  return (
    <PageShell header={header}>
      <InfoPanel title="Theme settings" storageKey="appearance-info" collapsible>
        <p>Choose a background theme to personalise your workspace. Panels become translucent with a frosted glass effect when a theme is active.</p>
      </InfoPanel>

      <div className="space-y-6">
        {/* Mode toggle */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Display Mode</h2>
          <div className="flex gap-3">
            <button
              onClick={() => setTheme({ mode: "light" })}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors",
                theme.mode === "light" ? "border-primary-500 bg-primary-50 text-primary-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
              )}
            >
              <Sun className="h-4 w-4" />Light
              {theme.mode === "light" && <Check className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={() => setTheme({ mode: "dark" })}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors",
                theme.mode === "dark" ? "border-primary-500 bg-primary-50 text-primary-700" : "border-gray-200 text-gray-600 hover:border-gray-300"
              )}
            >
              <Moon className="h-4 w-4" />Dark
              {theme.mode === "dark" && <Check className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Theme toggle */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Background Theme</h2>
              <p className="text-xs text-gray-400 mt-0.5">Replace the solid background with a scenic image</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs text-gray-500">{theme.enabled ? "On" : "Off"}</span>
              <button
                onClick={() => setTheme({ enabled: !theme.enabled })}
                className={cn(
                  "relative w-10 h-5 rounded-full transition-colors",
                  theme.enabled ? "bg-primary-500" : "bg-gray-300"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                  theme.enabled ? "translate-x-5" : "translate-x-0.5"
                )} />
              </button>
            </label>
          </div>

          {/* Theme grid */}
          <div className="grid grid-cols-3 gap-3">
            {/* No theme option */}
            <button
              onClick={() => setTheme({ backgroundImage: null, enabled: false })}
              className={cn(
                "relative rounded-lg border-2 overflow-hidden aspect-video transition-all",
                !theme.backgroundImage ? "border-primary-500 ring-2 ring-primary-200" : "border-gray-200 hover:border-gray-300"
              )}
            >
              <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                <X className="h-6 w-6 text-gray-400" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
                <span className="text-[10px] text-white font-medium">None (solid)</span>
              </div>
              {!theme.backgroundImage && (
                <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
            </button>

            {/* Theme images */}
            {THEME_BACKGROUNDS.map(bg => {
              const isSelected = theme.backgroundImage === bg.path
              return (
                <button
                  key={bg.id}
                  onClick={() => setTheme({ backgroundImage: bg.path, enabled: true })}
                  className={cn(
                    "relative rounded-lg border-2 overflow-hidden aspect-video transition-all",
                    isSelected ? "border-primary-500 ring-2 ring-primary-200" : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <img src={bg.path} alt={bg.name} className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
                    <span className="text-[10px] text-white font-medium">{bg.name}</span>
                  </div>
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Preview */}
        {isThemeActive && (
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Image className="h-4 w-4 text-gray-400" />Preview
            </h2>
            <div className="relative rounded-lg overflow-hidden h-48">
              <img src={theme.backgroundImage!} alt="Theme preview" className="absolute inset-0 w-full h-full object-cover" />
              {/* Simulated frosted panels */}
              <div className="absolute inset-0 flex gap-2 p-3">
                <div className="w-16 h-full bg-white/75 backdrop-blur-md rounded-lg" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-8 bg-white/80 backdrop-blur-md rounded-lg" />
                  <div className="flex-1 bg-white/85 backdrop-blur-sm rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  )
}
