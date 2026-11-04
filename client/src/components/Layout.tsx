import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Swords,
  FlaskConical,
  Table2,
  Sparkles,
} from 'lucide-react'
import { cn } from '../utils/cn'

const nav = [
  { to: '/', label: 'Arena', icon: Swords, end: true },
  { to: '/experiments', label: 'Eksperymenty', icon: FlaskConical },
  { to: '/benchmark', label: 'Benchmark', icon: Table2 },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
]

export function Layout() {
  return (
    <div className="flex min-h-screen bg-arena-bg">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-arena-border bg-arena-surface">
        <div className="flex items-center gap-2.5 border-b border-arena-border px-5 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-arena-accent/20 text-arena-accent">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight text-arena-text">ModelEval</div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-arena-dim">Arena</div>
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

        <div className="border-t border-arena-border p-4">
          <p className="text-[11px] leading-relaxed text-arena-dim">
            Blind pairwise · Rubryka ważona · API + SQLite
          </p>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}
