import { MIN_N_FOR_MEDIAN, TIERS, type MeasureKey, type TierDef } from '../config'
import type { PcrtRecord } from './data'

/** Linear-interpolated quantile of an ascending-sorted array (type 7, as in R/numpy). */
export function quantile(sorted: number[], p: number): number {
  if (!sorted.length) return NaN
  const h = (sorted.length - 1) * p
  const lo = Math.floor(h)
  const hi = Math.ceil(h)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (h - lo)
}

export interface EffectSummary {
  /** Number of records with a usable value for this measure. */
  n: number
  /** All usable values (ln ratios), ascending. */
  values: number[]
  /** Only set when n ≥ MIN_N_FOR_MEDIAN. */
  median: number | null
  q1: number | null
  q3: number | null
}

export function summarise(records: PcrtRecord[], measure: MeasureKey): EffectSummary {
  const values = records.map((r) => r.lnrr[measure]).filter((v): v is number => v != null).sort((a, b) => a - b)
  const enough = values.length >= MIN_N_FOR_MEDIAN
  return {
    n: values.length,
    values,
    median: enough ? quantile(values, 0.5) : null,
    q1: enough ? quantile(values, 0.25) : null,
    q3: enough ? quantile(values, 0.75) : null,
  }
}

export function tierFor(n: number): TierDef {
  return TIERS.find((t) => n >= t.min && n <= t.max) ?? TIERS[0]
}

/** Share of usable records where intervention > comparator. */
export function shareHigher(records: PcrtRecord[], measure: MeasureKey): { n: number; higher: number; share: number | null } {
  const v = records.map((r) => r.lnrr[measure]).filter((x): x is number => x != null)
  const higher = v.filter((x) => x > 0).length
  return { n: v.length, higher, share: v.length ? higher / v.length : null }
}

export function countBy<T>(items: T[], key: (t: T) => string | string[] | null): Map<string, number> {
  const m = new Map<string, number>()
  for (const it of items) {
    const k = key(it)
    if (k == null) continue
    for (const kk of Array.isArray(k) ? k : [k]) m.set(kk, (m.get(kk) ?? 0) + 1)
  }
  return m
}
