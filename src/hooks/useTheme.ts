import { useEffect, useState } from 'react'

export type ThemeMode = 'system' | 'light' | 'dark'

const THEME_KEY = 'travel-map.theme'

function loadTheme(): ThemeMode {
  const stored = localStorage.getItem(THEME_KEY)
  return stored === 'light' || stored === 'dark' ? stored : 'system'
}

function applyTheme(mode: ThemeMode) {
  if (mode === 'system') {
    delete document.documentElement.dataset.theme
  } else {
    document.documentElement.dataset.theme = mode
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(loadTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setTheme = (mode: ThemeMode) => {
    localStorage.setItem(THEME_KEY, mode)
    setThemeState(mode)
  }

  return { theme, setTheme }
}
