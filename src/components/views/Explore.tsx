import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { HAZARD_GROUPS, MEASURES, MIN_N_FOR_MEDIAN, PARENT_DESC, TIERS, type TierDef } from '../../config'
import { hazardLabel, matches, type Dataset, type PcrtRecord, type Selection } from '../../utils/data'
import { countBy, summarise, tierFor, type EffectSummary } from '../../utils/stats'
import { formatCount, formatRecords } from '../../utils/formatters'
import { Badge, Hint, InfoTip, StatCard, clickable, useOnceFlag } from '../shared/ui'
import { Effect } from '../shared/Effect'
import { DetailPanel } from './DetailPanel'

export interface TechRow {
  tech: string
  parent: string
  records: PcrtRecord[]
  n: number
  tier: TierDef
  benefit: EffectSummary
  cost: EffectSummary
  nStates: number
}

export function buildTechRows(records: PcrtRecord[], benefit: Selection['benefit']): TechRow[] {
  const by = new Map<string, PcrtRecord[]>()
  for (const r of records) {
    const a = by.get(r.tech)
    if (a) a.push(r)
    else by.set(r.tech, [r])
  }
  return [...by.entries()]
    .map(([tech, recs]) => ({
      tech,
      parent: recs[0].parent,
      records: recs,
      n: recs.length,
      tier: tierFor(recs.length),
      benefit: summarise(recs, benefit),
      cost: summarise(recs, 'cost'),
      nStates: new Set(recs.map((r) => r.state)).size,
    }))
    .sort((a, b) => b.n - a.n || a.tech.localeCompare(b.tech))
}

export function Explore({ ds, sel, records, update, goEvidence }: {
  ds: Dataset; sel: Selection; records: PcrtRecord[]; update: (p: Partial<Selection>) => void; goEvidence: () => void
}) {
  const [open, setOpen] = useState<string | null>(null)
  const [tierFilter, setTierFilter] = useState<string | null>(null)
  const [hint1Done, markHint1] = useOnceFlag('pcrt-explorer-hint-hazard')
  const [hint2Done, markHint2] = useOnceFlag('pcrt-explorer-hint-row')

  // Hint 1 is dismissed by the action it teaches: choosing a hazard or a state
  // (or arriving from a link that already has one).
  useEffect(() => {
    if (!hint1Done && (sel.hazard.kind !== 'all' || sel.state)) markHint1()
  }, [sel.hazard, sel.state, hint1Done, markHint1])

  const rows = useMemo(() => buildTechRows(records, sel.benefit), [records, sel.benefit])
  const shown = tierFilter ? rows.filter((r) => r.tier.key === tierFilter) : rows
  const maxN = rows[0]?.n ?? 1
  const tierCounts = countBy(rows, (r) => r.tier.key)
  const openRow = rows.find((r) => r.tech === open) ?? null

  useEffect(() => {
    if (open && !openRow) setOpen(null)
    if (tierFilter && !tierCounts.get(tierFilter)) setTierFilter(null)
  }, [open, openRow, tierFilter, tierCounts])

  const openTech = (t: string) => {
    setOpen(open === t ? null : t)
    if (!hint2Done) markHint2()
  }

  const nBenefit = records.filter((r) => r.lnrr[sel.benefit] != null).length
  const m = MEASURES[sel.benefit]
  const scopeLabel = sel.state ?? 'All India'

  if (!records.length) return <EmptyState ds={ds} sel={sel} update={update} />

  return (
    <div className="space-y-5">
      {!hint1Done && <Hint onDismiss={markHint1}>Start by picking a <b>hazard</b> and a <b>state</b> in the bar above.</Hint>}
      {hint1Done && !hint2Done && <Hint onDismiss={markHint2}>Click any technology to see the individual records behind it.</Hint>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Records" value={formatCount(records.length)} unit="demonstrations" subtitle={`${hazardLabel(sel.hazard, ds)} · ${scopeLabel}`} />
        <StatCard label="Technologies" value={formatCount(rows.length)} unit={`of ${ds.techs.length}`} subtitle={`in ${new Set(rows.map((r) => r.parent)).size} parent groups`} />
        <StatCard
          label={sel.state ? 'Districts' : 'States / UTs'}
          value={formatCount(sel.state ? new Set(records.map((r) => r.district).filter(Boolean)).size : new Set(records.map((r) => r.state)).size)}
          unit={sel.state ? 'named' : `of ${ds.states.length}`}
          subtitle={sel.state ? `${formatRecords(records.filter((r) => !r.district).length)} name no district` : 'represented in this selection'}
        />
        <StatCard
          label={`Usable ${m.short.toLowerCase()} pairs`}
          value={formatCount(nBenefit)}
          unit={m.unit ? `pairs, ${m.unit}` : 'pairs'}
          subtitle={`${Math.round((100 * nBenefit) / records.length)}% of records can be compared`}
          title={m.desc}
        />
      </div>

      <section className="bg-slate-900/60 border border-slate-800 rounded-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-3">
          <div>
            <h2 className="text-base font-semibold text-slate-100">What PCRT documents for this selection</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Ranked by number of records, not by effect. {MEASURES[sel.benefit].label} and cost are intervention vs its own comparator.{' '}
              <button onClick={goEvidence} className="text-[#4A9EFF] hover:underline">How far to trust these? →</button>
            </p>
          </div>
          <TierLegend counts={tierCounts} active={tierFilter} onPick={(k) => setTierFilter(tierFilter === k ? null : k)} />
        </div>

        <div className="hidden md:grid grid-cols-[minmax(0,2.2fr)_minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,1.4fr)_auto] gap-4 px-5 py-2 text-[11px] font-medium uppercase tracking-wider text-slate-500 border-y border-slate-800">
          <span>Technology</span>
          <span>Records</span>
          <span className="flex items-center gap-1.5">{m.short} change <InfoTip text={`${m.desc} Below ${MIN_N_FOR_MEDIAN} usable values the records are listed instead of a median.`} /></span>
          <span className="flex items-center gap-1.5">Cost change <InfoTip text={MEASURES.cost.desc} /></span>
          <span className="w-28">Evidence tier</span>
        </div>

        <ul>
          {shown.map((r) => (
            <li
              key={r.tech}
              {...clickable(() => openTech(r.tech), open === r.tech ? 'Click to close the records panel' : `Click to see the ${r.n} records behind ${r.tech}`)}
              className={clsx(
                'grid grid-cols-2 md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,1.4fr)_auto] gap-x-4 gap-y-3 px-5 py-3.5 border-b border-slate-800/70 cursor-pointer transition-colors duration-200',
                open === r.tech ? 'bg-[#4A9EFF]/10' : 'hover:bg-slate-800/40',
              )}
            >
              <div className="col-span-2 md:col-span-1 min-w-0">
                <p className="text-sm font-medium text-slate-100">{r.tech}</p>
                <p className="text-xs text-slate-500 mt-0.5" title={PARENT_DESC[r.parent]}>{r.parent}</p>
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold text-slate-100 tabular-nums">{r.n}</span>
                  <span className="text-xs text-slate-500">{r.n === 1 ? 'record' : 'records'} · {r.nStates} {r.nStates === 1 ? 'state' : 'states'}</span>
                </div>
                <div className="mt-1.5 h-1 rounded bg-slate-800 overflow-hidden">
                  <div className="h-full rounded" style={{ width: `${(100 * r.n) / maxN}%`, background: r.tier.color }} />
                </div>
              </div>
              <div className="md:hidden col-span-2 grid grid-cols-2 gap-4 text-[11px] uppercase tracking-wider text-slate-500 -mb-2">
                <span>{m.short}</span><span>Cost</span>
              </div>
              <div><Effect s={r.benefit} measure={sel.benefit} compact /></div>
              <div><Effect s={r.cost} measure="cost" compact /></div>
              <div className="col-span-2 md:col-span-1 md:w-28">
                <Badge color={r.tier.color} title={r.tier.desc}>{r.tier.label}</Badge>
              </div>
            </li>
          ))}
        </ul>
        <p className="px-5 py-3 text-xs text-slate-500">
          Benefit and cost are shown side by side, never netted. Positive cost change means the technology costs more than its comparator.
          Records can carry several hazards, so a technology may appear under more than one.
        </p>
      </section>

      {openRow && <DetailPanel row={openRow} sel={sel} ds={ds} onClose={() => setOpen(null)} />}
    </div>
  )
}

function TierLegend({ counts, active, onPick }: { counts: Map<string, number>; active: string | null; onPick: (k: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Evidence tier filter">
      {TIERS.map((t) => {
        const c = counts.get(t.key) ?? 0
        const dim = (active && active !== t.key) || c === 0
        return (
          <span
            key={t.key}
            {...(c ? clickable(() => onPick(t.key), active === t.key ? 'Click to show all tiers' : `Click to show only "${t.label}" (${t.desc})`) : { title: `${t.label}: ${t.desc} None in this selection.` })}
            className={clsx('flex items-center gap-1.5 rounded-full border border-slate-700 px-2 py-0.5 text-[11px] transition-opacity duration-200', c && 'cursor-pointer hover:border-slate-500')}
            style={{ opacity: dim ? 0.3 : 1 }}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: t.color }} />
            <span className="text-slate-300">{t.label}</span>
            <span className="text-slate-500 tabular-nums">{c}</span>
          </span>
        )
      })}
    </div>
  )
}

function EmptyState({ ds, sel, update }: { ds: Dataset; sel: Selection; update: (p: Partial<Selection>) => void }) {
  const hz = hazardLabel(sel.hazard, ds)
  const where = sel.state ?? 'All India'
  const extra = [sel.aez, sel.module].filter(Boolean)

  // Where else does this hazard have records (other filters held)?
  const elsewhere = useMemo(() => {
    if (!sel.state) return []
    return ds.states
      .map((st) => ({ st, n: ds.records.filter((r) => matches(r, { ...sel, state: st })).length }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n)
      .slice(0, 6)
  }, [ds, sel])
  const broader = sel.hazard.kind === 'token' ? HAZARD_GROUPS[ds.hazards[sel.hazard.bit].group] : null
  const broaderN = broader
    ? ds.records.filter((r) => matches(r, { ...sel, hazard: { kind: 'group', index: HAZARD_GROUPS.indexOf(broader) } })).length
    : 0
  const allHazN = ds.records.filter((r) => matches(r, { ...sel, hazard: { kind: 'all' } })).length

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 fade-in">
      <h2 className="text-lg font-semibold text-slate-100">
        No records for {hz} in {where}{extra.length ? ` (${extra.join(', ')})` : ''}.
      </h2>
      <p className="text-sm text-slate-400 mt-2 max-w-2xl">
        The catalogue covers 19 states unevenly; try All India or a broader hazard group. An empty result means PCRT documents nothing
        here — not that nothing works here.
      </p>
      <div className="flex flex-wrap gap-2 mt-5">
        {sel.state && (
          <button className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:border-[#4A9EFF]" onClick={() => update({ state: null })}>
            {hz} across All India
          </button>
        )}
        {broader && broaderN > 0 && (
          <button className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:border-[#4A9EFF]" onClick={() => update({ hazard: { kind: 'group', index: HAZARD_GROUPS.indexOf(broader) } })}>
            {broader.label} in {where} ({broaderN})
          </button>
        )}
        {sel.hazard.kind !== 'all' && allHazN > 0 && (
          <button className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:border-[#4A9EFF]" onClick={() => update({ hazard: { kind: 'all' } })}>
            All hazards in {where} ({allHazN})
          </button>
        )}
        {extra.length > 0 && (
          <button className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:border-[#4A9EFF]" onClick={() => update({ aez: null, module: null })}>
            Drop the AEZ / module filter
          </button>
        )}
      </div>
      {elsewhere.length > 0 && (
        <p className="text-sm text-slate-400 mt-5">
          {hz} is documented in:{' '}
          {elsewhere.map((x, i) => (
            <span key={x.st}>
              <span {...clickable(() => update({ state: x.st }), `Switch to ${x.st}`)} className="text-[#4A9EFF] hover:underline cursor-pointer">
                {x.st} ({x.n})
              </span>
              {i < elsewhere.length - 1 ? ', ' : ''}
            </span>
          ))}
        </p>
      )}
    </div>
  )
}
