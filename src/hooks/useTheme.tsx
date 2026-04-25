// Theme system — background images, transparent panels, dark mode.
//
// Tenants can enable a theme background image which replaces the
// solid grey page background with a full-bleed image. Panels become
// semi-transparent with backdrop blur (frosted glass effect).

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

export interface ThemeConfig {
  enabled: boolean
  backgroundImage: string | null // path under /themes/
  mode: "light" | "dark"
}

interface ThemeContextValue {
  theme: ThemeConfig
  setTheme: (updates: Partial<ThemeConfig>) => void
  isThemeActive: boolean // shorthand: enabled && has background
}

const STORAGE_KEY = "ledgius-theme"

const DEFAULT_THEME: ThemeConfig = {
  enabled: false,
  backgroundImage: null,
  mode: "light",
}

// Available pre-supplied theme backgrounds.
export const THEME_BACKGROUNDS = [
  { id: "wheat-field", name: "Wheat Field", path: "/themes/wheat-field-ready-for-harvest.jpg" },
  { id: "golden-sunrise", name: "Golden Sunrise", path: "/themes/golden-sunrise-field-stockcake.webp" },
  { id: "field-sunset", name: "Field Sunset", path: "/themes/field-sunset_328046-35459.avif" },
  { id: "outback-sunset", name: "Outback Sunset", path: "/themes/Outback_Sunset.webp" },
  { id: "sunrise-wheat", name: "Sunrise Over Wheat", path: "/themes/sunrise_over_wheat.jpeg" },
  { id: "australian-landscape", name: "Australian Landscape", path: "/themes/beautiful-australian-landscape-vector-illustration-600nw-2489497969.webp" },
]

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  isThemeActive: false,
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeConfig>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) return { ...DEFAULT_THEME, ...JSON.parse(stored) }
    } catch { /* ignore */ }
    return DEFAULT_THEME
  })

  const setTheme = (updates: Partial<ThemeConfig>) => {
    setThemeState(prev => {
      const next = { ...prev, ...updates }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  const isThemeActive = theme.enabled && !!theme.backgroundImage

  // Apply dark mode class to document.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme.mode === "dark")
  }, [theme.mode])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isThemeActive }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
