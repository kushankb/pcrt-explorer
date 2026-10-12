import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { HAZARD_DESC, HAZARD_GROUPS, MODULES, MULTI_HAZARD_NOTE, PARENT_DESC, SEQUENTIAL_BLUE } from '../../config'
import type { Dataset, PcrtRecord, Selection } from '../../utils/data'
import { countBy } from '../../utils/stats'
import { formatCount } from '../../utils/formatters'
import { ChartContainer, InfoTip, StatCard, clickable } from '../shared/ui'

export function Overview({ ds, onJump }: { ds: Dataset; onJump: (p: Partial<Selection>) => void }) {
  const recs = ds.records
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Records" value={formatCount(recs.length)} unit="demonstrations" subtitle="one row per reported demonstration" />
        <StatCard label="States / UTs" value={ds.states.length} unit="covered" subtitle="unevenly — see heatmap" />
        <StatCard label="Parent groups" value={ds.parents.length} unit="families" subtitle="the top of the classification" />
        <StatCard label="Technologies" value={ds.techs.length} unit="harmonised" subtitle={`from ${formatCount(new Set(recs.map((r) => r.title)).size)} verbatim titles`} />
        <StatCard label="Hazards" value={ds.hazards.length} unit="as printed" subtitle="in 4 hazard groups + residual" />
      </div>

      <Findings ds={ds} />
      <Classification ds={ds} />

      <ChartContainer
        title="Coverage: state × parent group"
        question="How many records each state documents in each family of technology. Click a state column to explore it."
        right={<HeatLegend max={maxOf(stateMatrix(ds))} />}
      >
        <Heatmap
          rows={ds.parents}
          rowDesc={(p) => PARENT_DESC[p]}
          cols={ds.states.map((s) => ({ key: s, label: s }))}
          matrix={stateMatrix(ds)}
          onCell={(_, c) => onJump({ state: c })}
          cellTitle={(r, c, n) => `${c} · ${r}: ${n} record${n === 1 ? '' : 's'}. Click to open Explore for ${c}.`}
        />
      </ChartContainer>

      <ChartContainer
        title="Coverage: hazard × parent group"
        question="How many records address each source hazard with each family of technology. Click a hazard column to explore it."
        right={<HeatLegend max={maxOf(hazardMatrix(ds))} />}
      >
        <Heatmap
          rows={ds.parents}
          rowDesc={(p) => PARENT_DESC[p]}
          cols={ds.hazards.map((h) => ({ key: h.name, label: h.name, color: HAZARD_GROUPS[h.group].color, desc: HAZARD_DESC[h.name] }))}
          matrix={hazardMatrix(ds)}
          onCell={(_, c) => onJump({ hazard: { kind: 'token', bit: ds.hazards.find((h) => h.name === c)!.bit } })}
          cellTitle={(r, c, n) => `${c} · ${r}: ${n} record${n === 1 ? '' : 's'}. Click to open Explore for ${c}.`}
        />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-slate-400">
          {HAZARD_GROUPS.filter((g) => ds.hazards.some((h) => HAZARD_GROUPS[h.group] === g)).map((g) => (
            <span key={g.key} className="flex items-center gap-1.5" title={g.desc}>
              <span className="w-3 h-1 rounded" style={{ background: g.color }} />{g.label}
            </span>
          ))}
          <span className="text-slate-500">· column colour bar = hazard group</span>
        </div>
        <p className="text-xs text-slate-500 mt-2">{MULTI_HAZARD_NOTE} The {recs.filter((r) => !r.hazards.length).length} records that state no hazard do not appear here.</p>
      </ChartContainer>
    </div>
  )
}

// ---------------------------------------------------------------------------
function Findings({ ds }: { ds: Dataset }) {
  const recs = ds.records
  const cp = recs.filter((r) => r.parent === 'Crop protection')
  const coastalIdx = HAZARD_GROUPS.findIndex((g) => g.key === 'Coastal hazards')
  const salIdx = HAZARD_GROUPS.findIndex((g) => g.key === 'Soil salinity (inland)')
  const coastal = recs.filter((r) => r.groupFlags & (1 << coastalIdx))
  const coastalTokens = new Set(coastal.flatMap((r) => r.hazards.filter((h) => ds.hazards.find((x) => x.name === h)?.group === coastalIdx)))
  const coastalStates = [...countBy(coastal, (r) => r.state).keys()]
  const coastalAezStates = [...new Set(recs.filter((r) => r.aezAtoms.includes('Coastal')).map((r) => r.state))].filter((s) => !coastalStates.includes(s))
  const sal = recs.filter((r) => r.groupFlags & (1 << salIdx))
  const salTop = [...countBy(sal, (r) => r.state).entries()].sort((a, b) => b[1] - a[1])[0]
  const slr = ds.hazards.some((h) => /sea level/i.test(h.name))
  const byState = [...countBy(recs, (r) => r.state).entries()].sort((a, b) => b[1] - a[1])
  const top3 = byState.slice(0, 3)
  const top3share = top3.reduce((s, x) => s + x[1], 0) / recs.length
  const noHaz = recs.filter((r) => !r.hazards.length).length

  const items: { head: string; body: string }[] = [
    {
      head: `Crop protection: ${cp.length} records`,
      body: `Pest and disease management appears in ${new Set(cp.map((r) => r.state)).size} of ${ds.states.length} states. Climate shifts pest pressure, but PCRT barely documents a response.`,
    },
    {
      head: `Coastal: ${coastal.length} records, all ${[...coastalTokens].join(', ').toLowerCase()}`,
      body: `Every one is in ${coastalStates.join(' or ')}. ${slr ? '' : 'Sea level rise appears nowhere in the catalogue. '}${coastalAezStates.length ? `${coastalAezStates.join(', ')} ha${coastalAezStates.length === 1 ? 's' : 've'} coastal-zone records but none for a coastal hazard.` : ''}`,
    },
    {
      head: `Salinity is inland: ${sal.length} records`,
      body: `${salTop ? `${salTop[1]} are in ${salTop[0]}.` : ''} This is sodicity from irrigation and geology, not seawater intrusion, so it is its own group, not part of Coastal hazards.`,
    },
    {
      head: 'No record states its year',
      body: 'Rupee values cannot be deflated, and nothing can be said about change over time.',
    },
    {
      head: `Three states hold ${Math.round(top3share * 100)}% of records`,
      body: `${top3.map(([s, n]) => `${s} ${n}`).join(', ')}. ${byState.at(-1)![0]} has ${byState.at(-1)![1]}, ${byState.at(-2)![0]} ${byState.at(-2)![1]}. An empty cell usually means "not documented", not "does not work".`,
    },
    {
      head: `${noHaz} records name no hazard`,
      body: 'They are marked "Not stated", never assigned an inferred hazard, and appear only under All hazards.',
    },
  ]
  return (
    <ChartContainer title="What is missing" question="Gaps in the catalogue, stated as findings rather than left as empty cells.">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((it) => (
          <div key={it.head} className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
            <p className="text-sm font-semibold text-amber-100">{it.head}</p>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{it.body}</p>
          </div>
        ))}
      </div>
    </ChartContainer>
  )
}

// ---------------------------------------------------------------------------
function Classification({ ds }: { ds: Dataset }) {
  const [parent, setParent] = useState<string | null>(null)
  const [isoMod, setIsoMod] = useState<string | null>(null)
  const modules = ds.modules

  const bars = useMemo(() => {
    const key = (r: PcrtRecord) => (parent ? r.tech : r.parent)
    const pool = parent ? ds.records.filter((r) => r.parent === parent) : ds.records
    const m = new Map<string, Record<string, number>>()
    for (const r of pool) {
      const k = key(r)
      const o = m.get(k) ?? {}
      o[r.module] = (o[r.module] ?? 0) + 1
      m.set(k, o)
    }
    return [...m.entries()]
      .map(([name, by]) => ({ name, by, total: Object.values(by).reduce((a, b) => a + b, 0) }))
      .sort((a, b) => b.total - a.total)
  }, [ds, parent])
  const max = Math.max(...bars.map((b) => b.total))
  const nTech = parent ? bars.length : null

  return (
    <ChartContainer
      title="Classification scheme"
      question={parent
        ? `${parent}: ${nTech} harmonised technologies. ${PARENT_DESC[parent] ?? ''}`
        : `${ds.parents.length} parent groups containing ${ds.techs.length} harmonised technologies, by module. Click a group to see its technologies.`}
      right={
        <div className="flex flex-wrap items-center gap-1.5">
          {modules.map((m) => (
            <span
              key={m}
              {...clickable(() => setIsoMod(isoMod === m ? null : m), isoMod === m ? 'Click to show all modules' : `Click to show only ${m}`)}
              className="flex items-center gap-1.5 rounded-full border border-slate-700 px-2.5 py-1 text-xs cursor-pointer hover:border-slate-500 transition-opacity duration-200"
              style={{ opacity: isoMod && isoMod !== m ? 0.3 : 1 }}
            >
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: MODULES[m]?.color ?? '#BBBBBB' }} />
              {MODULES[m]?.label ?? m}
              <InfoTip text={MODULES[m]?.desc ?? m} />
            </span>
          ))}
        </div>
      }
    >
      {parent && (
        <button onClick={() => setParent(null)} className="mb-3 text-sm text-[#4A9EFF] hover:underline" title="Back to all parent groups">
          ← All parent groups
        </button>
      )}
      <ul className="space-y-1.5">
        {bars.map((b) => {
          const shown = isoMod ? b.by[isoMod] ?? 0 : b.total
          return (
            <li
              key={b.name}
              {...(!parent ? clickable(() => setParent(b.name), `Click to see the technologies in ${b.name}`) : { title: b.name })}
              className={clsx('grid grid-cols-[minmax(0,260px)_1fr_48px] items-center gap-3 rounded px-1 py-0.5', !parent && 'cursor-pointer hover:bg-slate-800/50')}
            >
              <span className="text-xs text-slate-300 truncate" title={!parent ? PARENT_DESC[b.name] : b.name}>{b.name}</span>
              <span className="flex h-4 rounded overflow-hidden bg-slate-800/40">
                {modules.map((m) => {
                  const n = b.by[m] ?? 0
                  if (!n) return null
                  return (
                    <span
                      key={m}
                      title={`${m}: ${n} records`}
                      className="h-full transition-opacity duration-200"
                      style={{ width: `${(100 * n) / max}%`, background: MODULES[m]?.color ?? '#BBBBBB', opacity: isoMod && isoMod !== m ? 0.3 : 1 }}
                    />
                  )
                })}
              </span>
              <span className="text-xs text-slate-400 tabular-nums text-right">{shown}</span>
            </li>
          )
        })}
      </ul>
      <p className="text-xs text-slate-500 mt-3">
        Bar length = records. Parent groups do not nest cleanly inside modules — e.g. Water harvesting is mostly Natural resource management but
        includes some Crop production records — so each bar is split by the module the compendium filed it under.
      </p>
    </ChartContainer>
  )
}

// ---------------------------------------------------------------------------
type Matrix = Map<string, Map<string, number>>

const matrixCache = new WeakMap<Dataset, { state: Matrix; hazard: Matrix }>()
function matrices(ds: Dataset) {
  let m = matrixCache.get(ds)
  if (!m) {
    const state: Matrix = new Map()
    const hazard: Matrix = new Map()
    for (const r of ds.records) {
      const sr = state.get(r.parent) ?? new Map()
      sr.set(r.state, (sr.get(r.state) ?? 0) + 1)
      state.set(r.parent, sr)
      const hr = hazard.get(r.parent) ?? new Map()
      for (const h of r.hazards) hr.set(h, (hr.get(h) ?? 0) + 1)
      hazard.set(r.parent, hr)
    }
    m = { state, hazard }
    matrixCache.set(ds, m)
  }
  return m
}
const stateMatrix = (ds: Dataset) => matrices(ds).state
const hazardMatrix = (ds: Dataset) => matrices(ds).hazard
const maxOf = (m: Matrix) => Math.max(...[...m.values()].flatMap((r) => [...r.values()]))

function binColor(n: number, max: number): string | null {
  if (!n) return null
  // Linear bins over stops 1..7; stop 0 is the page ground and is reserved for zero.
  const i = Math.min(7, 1 + Math.floor((6.999 * (n - 1)) / Math.max(1, max - 1)))
  return SEQUENTIAL_BLUE[i]
}

function HeatLegend({ max }: { max: number }) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-slate-400" title="Linear colour bins from 1 record to the maximum cell. Empty cells have no records.">
      <span className="w-4 h-4 rounded-sm border border-slate-800" title="0 records" />
      <span>0</span>
      <span className="flex h-3 rounded-sm overflow-hidden">
        {SEQUENTIAL_BLUE.slice(1).map((c) => <span key={c} className="w-4" style={{ background: c }} />)}
      </span>
      <span>1 – {max} records (linear)</span>
    </div>
  )
}

function Heatmap({ rows, cols, matrix, onCell, cellTitle, rowDesc }: {
  rows: string[]
  cols: { key: string; label: string; color?: string; desc?: string }[]
  matrix: Matrix
  onCell: (row: string, col: string) => void
  cellTitle: (row: string, col: string, n: number) => string
  rowDesc: (row: string) => string | undefined
}) {
  const [hoverCol, setHoverCol] = useState<string | null>(null)
  const max = maxOf(matrix)
  const sortedRows = [...rows].sort((a, b) => sum(matrix.get(b)) - sum(matrix.get(a)))
  const colTotals = cols.map((c) => sortedRows.reduce((s, r) => s + (matrix.get(r)?.get(c.key) ?? 0), 0))
  const grid = { gridTemplateColumns: `minmax(170px,240px) repeat(${cols.length}, minmax(30px,1fr)) 44px` }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px]">
        <div className="grid gap-[3px] items-end" style={grid}>
          <span />
          {cols.map((c) => (
            <span
              key={c.key}
              title={c.desc ? `${c.label}: ${c.desc}` : c.label}
              className={clsx('flex flex-col items-center gap-1 text-[11px] leading-tight transition-colors', hoverCol === c.key ? 'text-slate-100' : 'text-slate-400')}
            >
              <span className="[writing-mode:vertical-rl] rotate-180 h-28 text-left truncate">{c.label}</span>
              {c.color && <span className="w-full h-1 rounded" style={{ background: c.color }} />}
            </span>
          ))}
          <span className="text-[11px] text-slate-500 text-right self-end">Total</span>
        </div>
        <div className="mt-1 space-y-[3px]">
          {sortedRows.map((r) => {
            const rowMap = matrix.get(r)
            return (
              <div key={r} className="grid gap-[3px] items-center" style={grid}>
                <span className="text-xs text-slate-300 truncate pr-2" title={rowDesc(r) ? `${r}: ${rowDesc(r)}` : r}>{r}</span>
                {cols.map((c) => {
                  const n = rowMap?.get(c.key) ?? 0
                  const bg = binColor(n, max)
                  return (
                    <span
                      key={c.key}
                      {...clickable(() => onCell(r, c.key), cellTitle(r, c.key, n))}
                      onMouseEnter={() => setHoverCol(c.key)}
                      onMouseLeave={() => setHoverCol(null)}
                      className={clsx(
                        'h-7 rounded-sm flex items-center justify-center text-[11px] tabular-nums cursor-pointer transition-[outline] duration-150 hover:outline hover:outline-1 hover:outline-slate-300',
                        bg ? 'text-slate-100' : 'border border-slate-800/80 text-transparent',
                      )}
                      style={bg ? { background: bg } : undefined}
                    >
                      {n || ''}
                    </span>
                  )
                })}
                <span className="text-xs text-slate-400 tabular-nums text-right">{sum(rowMap)}</span>
              </div>
            )
          })}
          <div className="grid gap-[3px] items-center pt-1 border-t border-slate-800" style={grid}>
            <span className="text-[11px] text-slate-500">Total</span>
            {colTotals.map((t, i) => <span key={cols[i].key} className="text-[11px] text-slate-400 tabular-nums text-center">{t}</span>)}
            <span />
          </div>
        </div>
      </div>
    </div>
  )
}

const sum = (m?: Map<string, number>) => (m ? [...m.values()].reduce((a, b) => a + b, 0) : 0)
