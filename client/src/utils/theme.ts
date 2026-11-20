export type ThemeMode = 'dark' | 'light'

const KEY = 'modeleval_theme'

export function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark'
  const stored = localStorage.getItem(KEY)
  return stored === 'light' ? 'light' : 'dark'
}

export function applyTheme(mode: ThemeMode) {
  const root = document.documentElement
  root.classList.toggle('light', mode === 'light')
  root.classList.toggle('dark', mode === 'dark')
  root.style.colorScheme = mode
  localStorage.setItem(KEY, mode)
  window.dispatchEvent(new CustomEvent('modeleval-theme-changed', { detail: mode }))
}

export function toggleTheme(): ThemeMode {
  const next: ThemeMode = getStoredTheme() === 'light' ? 'dark' : 'light'
  applyTheme(next)
  return next
}

/** Wywołaj przed pierwszym paintem Reacta. */
export function initTheme() {
  applyTheme(getStoredTheme())
}
