import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react'
import clsx from 'clsx'

/** Props that make any element a keyboard-reachable button. */
export function clickable(onActivate: () => void, title?: string) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    title,
    onClick: onActivate,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onActivate()
      }
    },
  }
}

export function StatCard({ label, value, unit, subtitle, color = '#e2e8f0', title }: {
  label: string; value: ReactNode; unit?: ReactNode; subtitle?: ReactNode; color?: string; title?: string
}) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 lift" title={title}>
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold" style={{ color }}>{value}</span>
        <span className="text-sm text-slate-400">{unit}</span>
      </div>
      {subtitle && <p className="text-xs text-slate-500 mt-1.5">{subtitle}</p>}
    </div>
  )
}

export function ChartContainer({ title, question, children, right, className }: {
  title: string; question?: string; children: ReactNode; right?: ReactNode; className?: string
}) {
  return (
    <section className={clsx('bg-slate-900/60 border border-slate-800 rounded-xl p-5', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-100">{title}</h2>
          {question && <p className="text-sm text-slate-400 mt-0.5">{question}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  )
}

export function LoadingSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
      <div className="h-8 w-8 rounded-full border-2 border-slate-700 border-t-[#4A9EFF] animate-spin" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

/** Small ⓘ with a hover/focus popover carrying a config `desc`. */
export function InfoTip({ text, className }: { text: string; className?: string }) {
  return (
    <span className={clsx('relative inline-flex group align-middle', className)}>
      <span
        tabIndex={0}
        aria-label={text}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-slate-600 text-[10px] text-slate-400 cursor-help leading-none"
      >
        i
      </span>
      <span className="pointer-events-none absolute z-50 left-1/2 -translate-x-1/2 top-6 w-72 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-normal normal-case tracking-normal text-slate-300 shadow-xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200">
        {text}
      </span>
    </span>
  )
}

export function Badge({ color, children, title }: { color: string; children: ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-slate-200"
      style={{ background: `${color}26`, border: `1px solid ${color}` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color, boxShadow: '0 0 0 1px #cbd5e155' }} />
      {children}
    </span>
  )
}

export function Select({ label, value, onChange, children, info, id }: {
  label: string; value: string; onChange: (v: string) => void; children: ReactNode; info?: string; id: string
}) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1 min-w-0">
      <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
        {label}
        {info && <InfoTip text={info} />}
      </span>
      <select id={id} className="control" value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
    </label>
  )
}

/** One-time hint, remembered under its own localStorage key. */
export function useOnceFlag(key: string): [boolean, () => void] {
  const [done, setDone] = useState(() => {
    try { return localStorage.getItem(key) === '1' } catch { return false }
  })
  const mark = () => {
    setDone(true)
    try { localStorage.setItem(key, '1') } catch { /* private mode */ }
  }
  return [done, mark]
}

export function Hint({ children, onDismiss }: { children: ReactNode; onDismiss: () => void }) {
  return (
    <div className="fade-in flex items-center gap-3 rounded-lg border border-[#4A9EFF]/40 bg-[#4A9EFF]/10 px-3 py-2 text-sm text-slate-200">
      <span className="text-[#4A9EFF]">→</span>
      <span className="flex-1">{children}</span>
      <button onClick={onDismiss} className="text-xs text-slate-400 hover:text-slate-200" title="Dismiss this hint">
        Dismiss
      </button>
    </div>
  )
}

export function Modal({ onClose, children, labelledBy }: { onClose: () => void; children: ReactNode; labelledBy: string }) {
  useEffect(() => {
    const k = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="fade-in max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
