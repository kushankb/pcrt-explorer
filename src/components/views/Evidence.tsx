import { useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts'
import clsx from 'clsx'
import { CATALOGUE_COLOR, COMPLETENESS_FIELDS, EFFECT_METHOD_DESC, MEASURES, SELECTION_COLOR, type MeasureKey } from '../../config'
import { selectionLabel, type Dataset, type PcrtRecord, type Selection } from '../../utils/data'
import { shareHigher } from '../../utils/stats'
import { formatCount, formatRecords, formatPctChange, formatRupeeTick, formatShare, formatValue } from '../../utils/formatters'
import { ChartContainer, StatCard, clickable } from '../shared/ui'

type Series = 'catalogue' | 'selection'
const SERIES: Record<Series, { label: string; color: string; desc: string }> = {
  catalogue: { label: 'Whole catalogue', color: CATALOGUE_COLOR, desc: 'All 905 records.' },
  selection: { label: 'Your selection', color: SELECTION_COLOR, desc: 'Records matching the filters in the bar above.' },
}

const SHARE_ORDER: MeasureKey[] = ['netReturn', 'bc', 'yield', 'cost']

export function Evidence({ ds, sel, records }: { ds: Dataset; sel: Selection; records: PcrtRecord[] }) {
  const filtered = records.length !== ds.records.length
  const [iso, setIso] = useState<Series | null>(null)
  const visible = (s: Series) => !iso || iso === s
  const all = ds.records
  const nr = shareHigher(all, 'netReturn')
  const cost = shareHigher(all, 'cost')
  const selNr = shareHigher(records, 'netReturn')

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-5 py-3">
        <p className="text-sm text-slate-300">
          Your selection: <span className="font-semibold text-slate-100">{selectionLabel(sel, ds)}</span>{' '}
          <span className="text-slate-500">· {formatRecords(records.length)} · {formatCount(new Set(records.map((r) => r.tech)).size)} technologies</span>
        </p>
        <SeriesLegend iso={iso} setIso={setIso} filtered={filtered} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Net return above comparator" value={formatShare(nr.share)} color={CATALOGUE_COLOR}
          unit="of pairs" subtitle={`${formatCount(nr.higher)} of ${formatCount(nr.n)} Rs/ha pairs, whole catalogue`}
        />
        <StatCard
          label="Cost above comparator" value={formatShare(cost.share)} color={CATALOGUE_COLOR}
          unit="of pairs" subtitle={`${formatCount(cost.higher)} of ${formatCount(cost.n)} — the unselected control`}
        />
        <StatCard label="Records stating a year" value="0" unit={`of ${formatCount(all.length)}`} subtitle="Rupee values cannot be deflated" />
        <StatCard
          label="Your selection: net return above" color={SELECTION_COLOR}
          value={selNr.n ? formatShare(selNr.share) : '—'}
          unit={selNr.n ? 'of pairs' : ''}
          subtitle={selNr.n ? `${formatCount(selNr.higher)} of ${formatCount(selNr.n)} Rs/ha pairs` : 'No Rs/ha net-return pairs in this selection'}
        />
      </div>

      <SelectionScatter all={all} records={records} filtered={filtered} visible={visible} />

      <div className="grid lg:grid-cols-2 gap-5">
        <ShareChart all={all} records={records} filtered={filtered} visible={visible} />
        <Completeness all={all} records={records} filtered={filtered} visible={visible} />
      </div>

      <HowToRead />
    </div>
  )
}

function SeriesLegend({ iso, setIso, filtered }: { iso: Series | null; setIso: (s: Series | null) => void; filtered: boolean }) {
  const keys: Series[] = filtered ? ['catalogue', 'selection'] : ['catalogue']
  return (
    <div className="flex items-center gap-2">
      {keys.map((k) => (
        <span
          key={k}
          {...(filtered ? clickable(() => setIso(iso === k ? null : k), iso === k ? 'Click to show both' : `Click to show only ${SERIES[k].label.toLowerCase()}`) : { title: SERIES[k].desc })}
          className={clsx('flex items-center gap-1.5 rounded-full border border-slate-700 px-2.5 py-1 text-xs transition-opacity duration-200', filtered && 'cursor-pointer hover:border-slate-500')}
          style={{ opacity: iso && iso !== k ? 0.3 : 1 }}
        >
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: SERIES[k].color }} />
          {SERIES[k].label}
        </span>
      ))}
      {!filtered && <span className="text-xs text-slate-500">Pick a hazard or state in the bar above to compare a selection.</span>}
    </div>
  )
}

interface Pt { x: number; y: number; id: string; tech: string; state: string; ln: number }

function SelectionScatter({ all, records, filtered, visible }: { all: PcrtRecord[]; records: PcrtRecord[]; filtered: boolean; visible: (s: Series) => boolean }) {
  const { cat, sel, lo, hi, above, total, selAbove } = useMemo(() => {
    const inSel = new Set(records.map((r) => r.id))
    const toPt = (r: PcrtRecord): Pt => ({ x: r.arms.netReturn.c!, y: r.arms.netReturn.i!, id: r.id, tech: r.tech, state: r.state, ln: r.lnrr.netReturn! })
    const usable = all.filter((r) => r.lnrr.netReturn != null)
    const cat = usable.filter((r) => !filtered || !inSel.has(r.id)).map(toPt)
    const sel = filtered ? usable.filter((r) => inSel.has(r.id)).map(toPt) : []
    const vals = usable.flatMap((r) => [r.arms.netReturn.i!, r.arms.netReturn.c!])
    const lo = 10 ** Math.floor(Math.log10(Math.min(...vals)))
    const hi = 10 ** Math.ceil(Math.log10(Math.max(...vals)))
    return {
      cat, sel, lo, hi,
      total: usable.length,
      above: usable.filter((r) => r.lnrr.netReturn! > 0).length,
      selAbove: sel.filter((p) => p.ln > 0).length,
    }
  }, [all, records, filtered])
  const ticks: number[] = []
  for (let t = lo; t <= hi; t *= 10) ticks.push(t)
  const excluded = all.filter((r) => r.arms.netReturn.i != null && r.arms.netReturn.c != null && r.arms.netReturn.unit === 'Rs/ha' && r.lnrr.netReturn == null).length

  return (
    <ChartContainer
      title="1 · The selection diagnostic"
      question={`Intervention vs comparator net return, one dot per record. ${formatCount(above)} of ${formatCount(total)} sit above the line of equality.`}
    >
      <div className="grid lg:grid-cols-[minmax(0,1fr)_280px] gap-5">
        <div className="h-[420px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 20 }}>
              <CartesianGrid strokeDasharray="2 4" />
              <XAxis
                type="number" dataKey="x" scale="log" domain={[lo, hi]} ticks={ticks} allowDataOverflow
                tickFormatter={formatRupeeTick}
                label={{ value: 'Comparator net return, Rs/ha (log scale)', position: 'insideBottom', offset: -18 }}
              />
              <YAxis
                type="number" dataKey="y" scale="log" domain={[lo, hi]} ticks={ticks} allowDataOverflow
                tickFormatter={formatRupeeTick}
                label={{ value: 'Intervention, Rs/ha (log scale)', angle: -90, position: 'insideLeft', offset: -8, style: { textAnchor: 'middle' } }}
              />
              <ZAxis range={[22, 22]} />
              <ReferenceLine segment={[{ x: lo, y: lo }, { x: hi, y: hi }]} stroke="#64748b" strokeDasharray="5 4" ifOverflow="extendDomain"
                label={{ value: 'equal', position: 'insideTopRight', fill: '#64748b', fontSize: 11 }} />
              <Tooltip content={<ScatterTip />} cursor={false} />
              {visible('catalogue') && <Scatter data={cat} fill={CATALOGUE_COLOR} fillOpacity={filtered ? 0.35 : 0.6} isAnimationActive={false} />}
              {filtered && visible('selection') && <Scatter data={sel} fill={SELECTION_COLOR} fillOpacity={0.9} isAnimationActive={false} />}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div className="text-sm text-slate-400 space-y-3">
          <p>
            If PCRT were a sample of what happens when farmers adopt these technologies, some would do worse than their comparator — weather,
            pests and management see to that. Points would scatter on both sides of the dashed line.
          </p>
          <p>
            Instead <span className="text-slate-100 font-medium">{formatShare(above / total)}</span> sit above it. That is what a catalogue of
            successes looks like: demonstrations were written up because they worked.
          </p>
          {filtered && (
            <p>
              <span style={{ color: SELECTION_COLOR }}>Your selection:</span>{' '}
              {sel.length ? `${selAbove} of ${sel.length} above the line.` : 'no Rs/ha net-return pairs to plot.'}
            </p>
          )}
          <p className="text-xs text-slate-500">
            Rs/ha records only, both arms positive. {excluded} Rs/ha pair{excluded === 1 ? ' has' : 's have'} a zero or negative arm and cannot sit on a log scale; they are excluded, not offset.
          </p>
        </div>
      </div>
    </ChartContainer>
  )
}

function ScatterTip({ active, payload }: { active?: boolean; payload?: { payload: Pt }[] }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="chart-tooltip">
      <p className="font-medium text-slate-100">{p.tech}</p>
      <p className="text-slate-400">{p.state} · {p.id}</p>
      <p className="mt-1 tabular-nums">Intervention {formatValue(p.y, 'Rs/ha')}</p>
      <p className="tabular-nums">Comparator {formatValue(p.x, 'Rs/ha')}</p>
      <p className="tabular-nums text-slate-100">{formatPctChange(p.ln)}</p>
    </div>
  )
}

interface ShareRow { label: string; key: MeasureKey; catalogue: number | null; catN: number; catHigher: number; selection: number | null; selN: number; selHigher: number }

function ShareChart({ all, records, filtered, visible }: { all: PcrtRecord[]; records: PcrtRecord[]; filtered: boolean; visible: (s: Series) => boolean }) {
  const data: ShareRow[] = SHARE_ORDER.map((k) => {
    const c = shareHigher(all, k)
    const s = shareHigher(records, k)
    return {
      key: k,
      label: `${MEASURES[k].short}${MEASURES[k].unit ? ` (${MEASURES[k].unit})` : ''}`,
      catalogue: c.share == null ? null : c.share * 100, catN: c.n, catHigher: c.higher,
      selection: s.share == null ? null : s.share * 100, selN: s.n, selHigher: s.higher,
    }
  })
  const costRow = data.find((d) => d.key === 'cost')!
  const benefitShares = data.filter((d) => d.key !== 'cost').map((d) => d.catalogue ?? 0)
  return (
    <ChartContainer
      title="2 · Share above comparator, by measure"
      question="Share of paired records where the intervention's value exceeds the comparator's."
    >
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 60, bottom: 10, left: 10 }} barCategoryGap="22%">
            <CartesianGrid horizontal={false} strokeDasharray="2 4" />
            <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} />
            <YAxis type="category" dataKey="label" width={130} />
            <Tooltip content={<ShareTip />} cursor={{ fill: '#1e293b55' }} />
            {visible('catalogue') && (
              <Bar dataKey="catalogue" fill={CATALOGUE_COLOR} radius={[0, 3, 3, 0]} isAnimationActive={false}>
                <LabelList dataKey="catalogue" position="right" formatter={(v: number) => formatShare(v / 100)} fill="#cbd5e1" fontSize={11} />
              </Bar>
            )}
            {filtered && visible('selection') && (
              <Bar dataKey="selection" fill={SELECTION_COLOR} radius={[0, 3, 3, 0]} isAnimationActive={false}>
                {data.map((d) => <Cell key={d.key} fillOpacity={d.selN < 5 ? 0.4 : 1} />)}
                <LabelList dataKey="selection" position="right" formatter={(v: number) => formatShare(v / 100)} fill={SELECTION_COLOR} fontSize={11} />
              </Bar>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-sm text-slate-400 mt-2">
        Benefits sit at {Math.round(Math.min(...benefitShares))}–{Math.round(Math.max(...benefitShares))}%. Cost is the control: nobody selects a demonstration for reporting <em>because</em> it cost more, so cost is
        free to vary — and it is higher in only {formatShare((costRow.catalogue ?? 0) / 100)} of pairs. The gap between the benefit bars and
        the cost bar is the selection.
      </p>
      {filtered && <p className="text-xs text-slate-500 mt-2">Faded selection bars rest on fewer than 5 pairs. Hover for counts.</p>}
    </ChartContainer>
  )
}

function ShareTip({ active, payload }: { active?: boolean; payload?: { payload: ShareRow }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="chart-tooltip">
      <p className="font-medium text-slate-100">{d.label}</p>
      <p className="tabular-nums" style={{ color: CATALOGUE_COLOR }}>Catalogue: {formatShare(d.catalogue == null ? null : d.catalogue / 100)} ({d.catHigher} of {d.catN})</p>
      {d.selN > 0 && <p className="tabular-nums" style={{ color: SELECTION_COLOR }}>Selection: {formatShare(d.selection == null ? null : d.selection / 100)} ({d.selHigher} of {d.selN})</p>}
      <p className="text-slate-500 mt-1 max-w-56">{MEASURES[d.key].desc}</p>
    </div>
  )
}

const HAS: Record<string, (r: PcrtRecord) => boolean> = {
  crop: (r) => r.crop != null,
  hazard: (r) => r.hazards.length > 0,
  aez: (r) => r.aezName != null,
  district: (r) => r.district != null,
  netReturn: (r) => r.lnrr.netReturn != null,
  yield: (r) => r.lnrr.yield != null,
  cost: (r) => r.lnrr.cost != null,
  year: () => false, // no year column exists in the source
}

function Completeness({ all, records, filtered, visible }: { all: PcrtRecord[]; records: PcrtRecord[]; filtered: boolean; visible: (s: Series) => boolean }) {
  const rows = COMPLETENESS_FIELDS.map((f) => {
    const c = all.filter(HAS[f.key]).length
    const s = records.filter(HAS[f.key]).length
    return { ...f, cat: c / all.length, catC: c, sel: records.length ? s / records.length : null, selC: s }
  })
  return (
    <ChartContainer title="3 · Completeness" question="Share of records that state each field.">
      <ul className="space-y-2.5">
        {rows.map((r) => (
          <li key={r.key} title={r.desc}>
            <div className="flex items-baseline justify-between text-xs mb-1">
              <span className={r.key === 'year' ? 'text-amber-200 font-medium' : 'text-slate-300'}>{r.label}</span>
              <span className="tabular-nums text-slate-400">
                {visible('catalogue') && <span>{formatShare(r.cat)} <span className="text-slate-600">({r.catC})</span></span>}
                {filtered && visible('selection') && <span className="ml-3" style={{ color: SELECTION_COLOR }}>{formatShare(r.sel)} <span className="opacity-60">({r.selC})</span></span>}
              </span>
            </div>
            {visible('catalogue') && (
              <div className="h-1.5 rounded bg-slate-800 overflow-hidden"><div className="h-full rounded" style={{ width: `${r.cat * 100}%`, background: CATALOGUE_COLOR }} /></div>
            )}
            {filtered && visible('selection') && (
              <div className="h-1.5 rounded bg-slate-800 overflow-hidden mt-0.5"><div className="h-full rounded" style={{ width: `${(r.sel ?? 0) * 100}%`, background: SELECTION_COLOR }} /></div>
            )}
          </li>
        ))}
      </ul>
      <p className="text-sm text-slate-400 mt-4">
        <span className="text-amber-200">No record states its year.</span> Net returns from different seasons are compared as if they were the
        same rupees, and none can be deflated. The outcome pairs are the binding constraint: only these records enter any median.
      </p>
    </ChartContainer>
  )
}

function HowToRead() {
  return (
    <ChartContainer title="4 · How to read the numbers in Explore">
      <div className="grid md:grid-cols-2 gap-x-8 gap-y-3 text-sm text-slate-400 leading-relaxed">
        <p>
          <span className="text-slate-200 font-medium">Read every figure as a ceiling.</span> A median "+51% net return" means: among
          demonstrations that were written up because they succeeded, half reported more than 51%. It is what the technology has been
          shown to do under good conditions, not what an adopting farmer should expect.
        </p>
        <p>
          <span className="text-slate-200 font-medium">Read the record count first.</span> It tells you how much has been documented, not how
          well the technology works. Records are often several rows from one table in one compendium, so 10 records may be one study.
          Below 5 usable values Explore lists the values and computes no median.
        </p>
        <p>
          <span className="text-slate-200 font-medium">Compare technologies by rank, cautiously.</span> All technologies share the same
          selection bias, so a large gap between two medians may still mean something. A small gap does not.
        </p>
        <p>
          <span className="text-slate-200 font-medium">Benefit and cost are kept apart.</span> A technology that raises net return by 40% while
          raising cost by 60% needs working capital the median benefit does not show. {EFFECT_METHOD_DESC}
        </p>
      </div>
    </ChartContainer>
  )
}
