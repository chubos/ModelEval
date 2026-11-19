import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  FlaskConical,
  KeyRound,
  LayoutDashboard,
  Settings,
  Sparkles,
  Swords,
  Table2,
} from 'lucide-react'
import { api } from '../api/client'
import { SettingsModal } from './SettingsModal'
import { cn } from '../utils/cn'
import { getStoredSettings } from '../utils/settings'

const nav = [
  { to: '/', label: 'Arena', icon: Swords, end: true },
  { to: '/experiments', label: 'Eksperymenty', icon: FlaskConical },
  { to: '/benchmark', label: 'Benchmark', icon: Table2 },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
]

export function Layout() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [hasKey, setHasKey] = useState(() => Boolean(getStoredSettings().apiKey.trim()))

  useEffect(() => {
    let cancelled = false
    const checkKey = () => {
      const local = getStoredSettings()
      if (local.apiKey.trim()) {
        if (!cancelled) setHasKey(true)
        return
      }
      api.config()
        .then((cfg) => {
          if (!cancelled) setHasKey(cfg.hasApiKey)
        })
        .catch(() => {
          if (!cancelled) setHasKey(false)
        })
    }

    if (!hasKey) {
      checkKey()
    }

    window.addEventListener('modeleval-settings-changed', checkKey)
    return () => {
      cancelled = true
      window.removeEventListener('modeleval-settings-changed', checkKey)
    }
  }, [hasKey])

  return (
    <div className="flex min-h-screen bg-arena-bg">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-arena-border bg-arena-surface">
        <div className="flex items-center gap-2.5 border-b border-arena-border px-5 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-arena-accent/20 text-arena-accent">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight text-arena-text">ModelEval</div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-arena-dim">Arena LLM</div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-arena-accent/15 text-arena-accent'
                    : 'text-arena-muted hover:bg-arena-elevated hover:text-arena-text',
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Panel Ustawień i stanu API */}
        <div className="space-y-2 border-t border-arena-border p-3">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="flex w-full items-center justify-between rounded-lg border border-arena-border bg-arena-card px-3 py-2 text-xs font-medium text-arena-text transition hover:border-arena-border-hover hover:bg-arena-elevated"
          >
            <div className="flex items-center gap-2">
              <Settings className="h-3.5 w-3.5 text-arena-muted" />
              <span>Ustawienia API</span>
            </div>
            <span className="flex items-center gap-1.5 font-mono text-[10px]">
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  hasKey ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-amber-400 animate-pulse',
                )}
              />
              <span className={hasKey ? 'text-emerald-400' : 'text-amber-400'}>
                {hasKey ? 'Połączono' : 'Brak klucza'}
              </span>
            </span>
          </button>

          {!hasKey && (
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="flex w-full items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-300 hover:bg-amber-500/20"
            >
              <KeyRound className="h-3.5 w-3.5 shrink-0" />
              <span>Podaj klucz OpenRouter</span>
            </button>
          )}

          <div className="pt-2">
            <p className="text-[10px] leading-relaxed text-arena-dim">
              Prawdziwe API · Blind pairwise · Rubryka ważona
            </p>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <Outlet />
      </main>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
