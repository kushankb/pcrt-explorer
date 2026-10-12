import { useMemo } from 'react'
import { AEZ_FILTER_DESC, AEZ_GROUPS, BENEFIT_MEASURES, DEFAULT_BENEFIT_WHY, HAZARD_GROUPS, MEASURES, MULTI_HAZARD_NOTE, type MeasureKey } from '../config'
import { matches, type Dataset, type HazardSel, type Selection } from '../utils/data'
import { formatCount } from '../utils/formatters'
import { Select } from './shared/ui'

const encode = (h: HazardSel) => (h.kind === 'all' ? 'all' : h.kind === 'group' ? `g${h.index}` : `t${h.bit}`)
const decode = (s: string): HazardSel =>
  s.startsWith('g') ? { kind: 'group', index: +s.slice(1) } : s.startsWith('t') ? { kind: 'token', bit: +s.slice(1) } : { kind: 'all' }

/**
 * Shared filters. Option labels show how many records each choice would leave given the
 * other filters, so a reader can see an empty combination before choosing it.
 */
export function ControlBar({ ds, sel, update, reset, n }: {
  ds: Dataset; sel: Selection; update: (p: Partial<Selection>) => void; reset: () => void; n: number
}) {
  const count = (patch: Partial<Selection>) => {
    const s = { ...sel, ...patch }
    let c = 0
    for (const r of ds.records) if (matches(r, s)) c++
    return c
  }
  // Recomputed only when a filter changes — 905 rows × ~45 options is trivial.
  const counts = useMemo(() => ({
    hazardAll: count({ hazard: { kind: 'all' } }),
    groups: HAZARD_GROUPS.map((_, i) => count({ hazard: { kind: 'group', index: i } })),
    tokens: ds.hazards.map((h) => count({ hazard: { kind: 'token', bit: h.bit } })),
    stateAll: count({ state: null }),
    states: ds.states.map((st) => count({ state: st })),
    aezAll: count({ aez: null }),
    aez: AEZ_GROUPS.map((a) => count({ aez: a.key })),
    modAll: count({ module: null }),
    mods: ds.modules.map((m) => count({ module: m })),
  }), [ds, sel.hazard, sel.state, sel.aez, sel.module])

  const isDefault = sel.hazard.kind === 'all' && !sel.state && !sel.aez && !sel.module
  const lbl = (name: string, c: number) => `${name} (${formatCount(c)})`

  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
      <div className="w-full sm:w-64">
        <Select id="hz" label="Hazard" value={encode(sel.hazard)} onChange={(v) => update({ hazard: decode(v) })} info={MULTI_HAZARD_NOTE}>
          <option value="all">{lbl('All hazards', counts.hazardAll)}</option>
          <optgroup label="Hazard groups">
            {HAZARD_GROUPS.map((g, i) => g.selectable && (
              <option key={g.key} value={`g${i}`}>{lbl(g.label, counts.groups[i])}</option>
            ))}
          </optgroup>
          {HAZARD_GROUPS.map((g, gi) => {
            const toks = ds.hazards.filter((h) => h.group === gi)
            if (!toks.length) return null
            return (
              <optgroup key={g.key} label={`${g.label} — source hazards`}>
                {toks.map((h) => (
                  <option key={h.name} value={`t${h.bit}`}>{lbl(h.name, counts.tokens[h.bit])}</option>
                ))}
              </optgroup>
            )
          })}
        </Select>
      </div>
      <div className="w-[calc(50%-0.5rem)] sm:w-48">
        <Select id="st" label="State / UT" value={sel.state ?? ''} onChange={(v) => update({ state: v || null })}>
          <option value="">{lbl('All India', counts.stateAll)}</option>
          {ds.states.map((st, i) => (
            <option key={st} value={st}>{lbl(st, counts.states[i])}</option>
          ))}
        </Select>
      </div>
      <div className="w-[calc(50%-0.5rem)] sm:w-44">
        <Select id="aez" label="AEZ group" value={sel.aez ?? ''} onChange={(v) => update({ aez: v || null })} info={AEZ_FILTER_DESC}>
          <option value="">{lbl('Any AEZ', counts.aezAll)}</option>
          {AEZ_GROUPS.map((a, i) => (
            <option key={a.key} value={a.key}>{lbl(a.key, counts.aez[i])}</option>
          ))}
        </Select>
      </div>
      <div className="w-[calc(50%-0.5rem)] sm:w-52">
        <Select id="mod" label="Module" value={sel.module ?? ''} onChange={(v) => update({ module: v || null })}>
          <option value="">{lbl('Any module', counts.modAll)}</option>
          {ds.modules.map((m, i) => (
            <option key={m} value={m}>{lbl(m, counts.mods[i])}</option>
          ))}
        </Select>
      </div>
      <div className="w-[calc(50%-0.5rem)] sm:w-44">
        <Select
          id="m" label="Benefit measure" value={sel.benefit}
          onChange={(v) => update({ benefit: v as MeasureKey })}
          info={`${DEFAULT_BENEFIT_WHY} ${MEASURES[sel.benefit].desc}`}
        >
          {BENEFIT_MEASURES.map((k) => (
            <option key={k} value={k}>{MEASURES[k].label}{MEASURES[k].unit ? ` (${MEASURES[k].unit})` : ''}</option>
          ))}
        </Select>
      </div>
      <div className="flex items-center gap-3 pb-1.5 ml-auto">
        <span className="text-sm text-slate-400 tabular-nums">
          <span className="text-slate-100 font-semibold">{formatCount(n)}</span> {n === 1 ? 'record matches' : 'records match'}
        </span>
        {!isDefault && (
          <button onClick={reset} className="text-xs text-slate-400 hover:text-slate-100 underline underline-offset-2" title="Clear hazard, state, AEZ and module filters">
            Reset filters
          </button>
        )}
      </div>
    </div>
  )
}
