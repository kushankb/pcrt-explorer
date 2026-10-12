// Every number shown in the UI goes through here. Effect sizes arrive as ln ratios and
// are ALWAYS back-transformed — a log value is never printed anywhere.

const int = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

/** ln ratio → "1.5×" */
export function formatRatio(ln: number): string {
  const r = Math.exp(ln)
  if (r >= 10) return `${r.toFixed(0)}×`
  if (r >= 2) return `${r.toFixed(1)}×`
  return `${r.toFixed(2)}×`
}

/** ln ratio → "+51%" / "−12%" */
export function formatPctChange(ln: number): string {
  const p = (Math.exp(ln) - 1) * 100
  const abs = Math.abs(p)
  const s = abs >= 100 ? int.format(abs) : abs >= 10 ? abs.toFixed(0) : abs.toFixed(1)
  if (s === '0' || s === '0.0') return '±0%'
  return `${p >= 0 ? '+' : '−'}${s}%`
}

/** IQR of ln ratios → "+20% to +90%" */
export function formatPctRange(lo: number, hi: number): string {
  return `${formatPctChange(lo)} to ${formatPctChange(hi)}`
}

export function formatCount(n: number): string {
  return int.format(n)
}

/** "n = 12" — the one way to label a sample size. */
export function formatN(n: number): string {
  return `n = ${int.format(n)}`
}

/** 0.9932 → "99.3%" */
export function formatShare(p: number | null): string {
  if (p == null || Number.isNaN(p)) return '—'
  return `${(p * 100).toFixed(1)}%`
}

/** Raw value with its unit as printed: 45200, "Rs/ha" → "₹45,200 /ha" */
export function formatValue(v: number | null, unit: string | null): string {
  if (v == null) return '—'
  const a = Math.abs(v)
  const sign = v < 0 ? '−' : ''
  const num = a >= 100 ? int.format(a) : Number.isInteger(a) ? String(a) : a.toFixed(2)
  if (!unit) return `${sign}${num}`
  if (unit.startsWith('Rs')) {
    const rest = unit.slice(2)
    return `${sign}₹${num}${rest ? ` ${rest}` : ''}`
  }
  return `${sign}${num} ${unit}`
}

/** Rupee axis tick: 45200 → "₹45k", 1200000 → "₹12 lakh" */
export function formatRupeeTick(v: number): string {
  if (v >= 1e7) return `₹${+(v / 1e7).toFixed(1)} cr`
  if (v >= 1e5) return `₹${+(v / 1e5).toFixed(1)} lakh`
  if (v >= 1e3) return `₹${+(v / 1e3).toFixed(0)}k`
  return `₹${int.format(v)}`
}

export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** 1 → "1 record", 3 → "3 records" */
export function formatRecords(n: number, noun = 'record'): string {
  return `${int.format(n)} ${noun}${n === 1 ? '' : 's'}`
}
