import { useEffect } from 'react'
import { HAZARD_GROUPS, MEASURES, PARENT_DESC, type MeasureKey } from '../../config'
import { selectionLabel, type Dataset, type PcrtRecord, type Selection } from '../../utils/data'
import { summarise } from '../../utils/stats'
import { formatN, formatPctChange, formatRatio, formatValue } from '../../utils/formatters'
import { Badge } from '../shared/ui'
import { Effect } from '../shared/Effect'
import type { TechRow } from './Explore'

const ORDER: MeasureKey[] = ['netReturn', 'yield', 'bc', 'cost']

export function DetailPanel({ row, sel, ds, onClose }: { row: TechRow; sel: Selection; ds: Dataset; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  const groupOf = new Map(ds.hazards.map((h) => [h.name, h.group]))
  const hazardColor = (h: string) => HAZARD_GROUPS[groupOf.get(h) ?? 5].color
  const recs = [...row.records].sort((a, b) => a.state.localeCompare(b.state) || a.id.localeCompare(b.id))

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-950/50" onClick={onClose} aria-hidden />
      <aside
        className="slide-in fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[560px] lg:w-[640px] overflow-y-auto border-l border-slate-700 bg-slate-900 shadow-2xl"
        aria-label={`Records for ${row.tech}`}
      >
        <div className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900/95 backdrop-blur px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-slate-500" title={PARENT_DESC[row.parent]}>{row.parent}</p>
              <h2 className="text-lg font-semibold text-slate-100 leading-snug">{row.tech}</h2>
              <p className="text-xs text-slate-500 mt-1">{selectionLabel(sel, ds)}</p>
            </div>
            <button onClick={onClose} className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100" title="Close the records panel (Esc)">
              ✕
            </button>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-2xl font-bold text-slate-100 tabular-nums">{row.n}</span>
            <span className="text-sm text-slate-400">{row.n === 1 ? 'record' : 'records'} in {row.nStates} {row.nStates === 1 ? 'state' : 'states'}</span>
            <Badge color={row.tier.color} title={row.tier.desc}>{row.tier.label}</Badge>
          </div>
        </div>

        <div className="px-5 py-4 grid grid-cols-2 gap-4 border-b border-slate-800">
          {ORDER.map((k) => (
            <div key={k}>
              <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1" title={MEASURES[k].desc}>
                {MEASURES[k].label}{MEASURES[k].unit ? ` (${MEASURES[k].unit})` : ''}
              </p>
              <Effect s={summarise(row.records, k)} measure={k} compact />
            </div>
          ))}
          <p className="col-span-2 text-[11px] text-amber-200/80">Reported successes: read each figure as a ceiling, not an expectation.</p>
        </div>

        <ul className="divide-y divide-slate-800">
          {recs.map((r) => <RecordCard key={r.id} r={r} hazardColor={hazardColor} />)}
        </ul>
      </aside>
    </>
  )
}

function RecordCard({ r, hazardColor }: { r: PcrtRecord; hazardColor: (h: string) => string }) {
  return (
    <li className="px-5 py-4 space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-100 leading-snug">{r.title}</p>
        <span className="shrink-0 text-[11px] text-slate-500 tabular-nums">{r.id}</span>
      </div>
      <p className="text-xs text-slate-400">
        {r.state}{r.district ? ` · ${r.district}` : ' · district not stated'}
        {r.aezName ? ` · ${r.aezName}` : ''}
        {r.crop ? ` · ${r.crop}` : ''}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {r.hazards.length
          ? r.hazards.map((h) => <Badge key={h} color={hazardColor(h)}>{h}</Badge>)
          : <Badge color={HAZARD_GROUPS[5].color}>Hazard not stated</Badge>}
        {r.secondary && <span className="text-[11px] text-slate-500">+ bundled: {r.secondary}</span>}
      </div>
      <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 text-xs">
        <dt className="text-slate-500">Intervention</dt>
        <dd className="text-slate-300">{r.intervention ?? <span className="text-slate-600">not printed</span>}</dd>
        <dt className="text-slate-500">Comparator</dt>
        <dd className="text-slate-300">{r.comparator ?? <span className="text-slate-600">not named</span>}</dd>
      </dl>
      <OutcomeTable r={r} />
    </li>
  )
}

function OutcomeTable({ r }: { r: PcrtRecord }) {
  const lines = ORDER.filter((k) => r.arms[k].i != null || r.arms[k].c != null)
  if (!lines.length) return <p className="text-xs text-slate-600">No outcome values reported.</p>
  return (
    <table className="w-full text-xs tabular-nums">
      <thead>
        <tr className="text-slate-500 text-left">
          <th className="font-normal py-1">Measure</th>
          <th className="font-normal py-1 text-right">Intervention</th>
          <th className="font-normal py-1 text-right">Comparator</th>
          <th className="font-normal py-1 text-right">Change</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((k) => {
          const a = r.arms[k]
          const ln = r.lnrr[k]
          const m = MEASURES[k]
          let why = ''
          if (ln == null) {
            if (a.i == null || a.c == null) why = 'one arm missing'
            else if (m.unit && a.unit !== m.unit) why = `${a.unit ?? 'no unit'} — not comparable, excluded`
            else why = 'non-positive arm, excluded'
          }
          return (
            <tr key={k} className="border-t border-slate-800/70">
              <td className="py-1 text-slate-400">{m.short}</td>
              <td className="py-1 text-right text-slate-200">{formatValue(a.i, k === 'bc' ? null : a.unit)}</td>
              <td className="py-1 text-right text-slate-300">{formatValue(a.c, k === 'bc' ? null : a.unit)}</td>
              <td className="py-1 text-right">
                {ln != null
                  ? <span className="text-slate-100" title={formatN(1)}>{formatPctChange(ln)} <span className="text-slate-500">({formatRatio(ln)})</span></span>
                  : <span className="text-slate-600">{why}</span>}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
