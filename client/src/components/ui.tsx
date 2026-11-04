import type { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from 'react'
import { cn } from '../utils/cn'

export function Card({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-arena-border bg-arena-card shadow-sm',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-arena-border px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold tracking-wide text-arena-text">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-arena-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function Badge({
  children,
  tone = 'neutral',
}: PropsWithChildren<{
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'a' | 'b'
}>) {
  const tones = {
    neutral: 'bg-arena-elevated text-arena-muted border-arena-border',
    accent: 'bg-arena-accent-soft text-arena-accent border-arena-accent/30',
    success: 'bg-arena-success-soft text-arena-success border-arena-success/30',
    warning: 'bg-amber-950 text-arena-warning border-amber-700/40',
    danger: 'bg-arena-danger-soft text-arena-danger border-arena-danger/30',
    a: 'bg-sky-950 text-arena-model-a border-sky-700/40',
    b: 'bg-orange-950 text-arena-model-b border-orange-700/40',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider',
        tones[tone],
      )}
    >
      {children}
    </span>
  )
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}) {
  const variants = {
    primary:
      'bg-arena-accent text-white hover:bg-blue-500 border-transparent focus-visible:ring-arena-accent',
    secondary:
      'bg-arena-elevated text-arena-text hover:bg-arena-border border-arena-border',
    ghost: 'bg-transparent text-arena-muted hover:text-arena-text hover:bg-arena-elevated border-transparent',
    danger:
      'bg-arena-danger-soft text-arena-danger hover:bg-red-900/60 border-arena-danger/30',
    success:
      'bg-arena-success-soft text-arena-success hover:bg-green-900/50 border-arena-success/30',
    outline:
      'bg-transparent text-arena-text border-arena-border hover:border-arena-border-hover hover:bg-arena-elevated',
  }
  const sizes = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-3.5 py-2 text-sm',
    lg: 'px-5 py-2.5 text-sm',
  }
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg border font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-arena-bg disabled:pointer-events-none disabled:opacity-40',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: ReactNode
  hint?: string
}) {
  return (
    <div className="rounded-xl border border-arena-border bg-arena-card px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-arena-dim">{label}</div>
      <div className="mt-1 font-mono text-xl font-semibold text-arena-text">{value}</div>
      {hint && <div className="mt-1 text-xs text-arena-muted">{hint}</div>}
    </div>
  )
}
