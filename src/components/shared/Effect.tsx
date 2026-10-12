import { MEASURES, MIN_N_FOR_MEDIAN, type MeasureKey } from '../../config'
import { formatN, formatPctChange, formatPctRange, formatRatio } from '../../utils/formatters'
import type { EffectSummary } from '../../utils/stats'

/**
 * One effect summary. Median + IQR + n when there are enough values; otherwise the
 * individual values, never a median.
 */
export function Effect({ s, measure, compact = false }: { s: EffectSummary; measure: MeasureKey; compact?: boolean }) {
  const m = MEASURES[measure]
  if (s.n === 0) {
    return (
      <span className="text-xs text-slate-500" title={m.desc}>
        No usable {m.short.toLowerCase()} pairs{m.unit ? ` in ${m.unit}` : ''}
      </span>
    )
  }
  if (s.median == null) {
    return (
      <div title={`Fewer than ${MIN_N_FOR_MEDIAN} usable values, so each is shown instead of a median.`}>
        <div className="flex flex-wrap gap-1">
          {s.values.map((v, i) => (
            <span key={i} className="rounded bg-slate-800 px-1.5 py-0.5 text-xs tabular-nums text-slate-200">
              {formatPctChange(v)}
            </span>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 mt-1">
          {formatN(s.n)} · each record shown, no median
        </p>
      </div>
    )
  }
  return (
    <div title={`Median and interquartile range of ${s.n} records. ${m.desc}`}>
      <div className="flex items-baseline gap-1.5">
        <span className={compact ? 'text-base font-semibold text-slate-100 tabular-nums' : 'text-lg font-semibold text-slate-100 tabular-nums'}>
          {formatPctChange(s.median)}
        </span>
        <span className="text-xs text-slate-400 tabular-nums">{formatRatio(s.median)}</span>
      </div>
      <p className="text-[11px] text-slate-500 tabular-nums">
        IQR {formatPctRange(s.q1!, s.q3!)} · {formatN(s.n)}
      </p>
    </div>
  )
}
