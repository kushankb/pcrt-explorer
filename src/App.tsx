import { useCallback, useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { APP_TITLE, APP_SUBTITLE, BENEFIT_MEASURES, CEILING_CAVEAT, DEFAULT_BENEFIT, MEASURES, type MeasureKey } from './config'
import { loadDataset, matches, type Dataset, type HazardSel, type Selection } from './utils/data'
import { LoadingSpinner } from './components/shared/ui'
import { ControlBar } from './components/ControlBar'
import { AboutPanel } from './components/AboutPanel'
import { WelcomeOverlay, HowToPanel } from './components/Onboarding'
import { Overview } from './components/views/Overview'
import { Explore } from './components/views/Explore'
import { Evidence } from './components/views/Evidence'
import { formatDate } from './utils/formatters'

export type Tab = 'overview' | 'explore' | 'evidence'

const TABS: { key: Tab; label: string; question: string }[] = [
  { key: 'overview', label: 'Overview', question: 'What is in this catalogue, and how is it classified?' },
  { key: 'explore', label: 'Explore', question: "I'm in this state facing this hazard — what does PCRT suggest?" },
  { key: 'evidence', label: 'Evidence', question: 'How much should I trust what Explore just told me?' },
]

const DEFAULT_SEL: Selection = { hazard: { kind: 'all' }, state: null, aez: null, module: null, benefit: DEFAULT_BENEFIT }

// --- URL hash <-> state, so a pasted link restores the view -------------------
function encodeHazard(h: HazardSel): string {
  return h.kind === 'all' ? 'all' : h.kind === 'group' ? `g${h.index}` : `t${h.bit}`
}
function decodeHazard(s: string | null): HazardSel {
  if (s && /^g\d+$/.test(s)) return { kind: 'group', index: +s.slice(1) }
  if (s && /^t\d+$/.test(s)) return { kind: 'token', bit: +s.slice(1) }
  return { kind: 'all' }
}
function readHash(): { tab: Tab; sel: Selection } {
  const p = new URLSearchParams(window.location.hash.slice(1))
  const tab = (['overview', 'explore', 'evidence'] as Tab[]).find((t) => t === p.get('tab')) ?? 'explore'
  const m = p.get('m') as MeasureKey | null
  return {
    tab,
    sel: {
      hazard: decodeHazard(p.get('hz')),
      state: p.get('st'),
      aez: p.get('aez'),
      module: p.get('mod'),
      benefit: m && BENEFIT_MEASURES.includes(m) ? m : DEFAULT_BENEFIT,
    },
  }
}
function writeHash(tab: Tab, sel: Selection) {
  const p = new URLSearchParams()
  p.set('tab', tab)
  if (sel.hazard.kind !== 'all') p.set('hz', encodeHazard(sel.hazard))
  if (sel.state) p.set('st', sel.state)
  if (sel.aez) p.set('aez', sel.aez)
  if (sel.module) p.set('mod', sel.module)
  if (sel.benefit !== DEFAULT_BENEFIT) p.set('m', sel.benefit)
  history.replaceState(null, '', `#${p.toString()}`)
}

export default function App() {
  const [ds, setDs] = useState<Dataset | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const initial = useMemo(readHash, [])
  const [tab, setTab] = useState<Tab>(initial.tab)
  const [sel, setSel] = useState<Selection>(initial.sel)
  const [about, setAbout] = useState(false)

  useEffect(() => {
    loadDataset().then(setDs).catch((e: Error) => setErr(e.message))
  }, [])

  // Drop hash values that don't exist in this data version.
  useEffect(() => {
    if (!ds) return
    setSel((s) => ({
      ...s,
      state: s.state && ds.states.includes(s.state) ? s.state : null,
      module: s.module && ds.modules.includes(s.module) ? s.module : null,
      hazard: s.hazard.kind === 'token' && !ds.hazards[s.hazard.bit] ? { kind: 'all' } : s.hazard,
    }))
  }, [ds])

  useEffect(() => writeHash(tab, sel), [tab, sel])
  // replaceState never fires hashchange, so this only reacts to edited or pasted URLs.
  useEffect(() => {
    const on = () => {
      const h = readHash()
      setTab(h.tab)
      setSel(h.sel)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  const filtered = useMemo(() => (ds ? ds.records.filter((r) => matches(r, sel)) : []), [ds, sel])

  const update = useCallback((patch: Partial<Selection>) => setSel((s) => ({ ...s, ...patch })), [])
  const jumpToExplore = useCallback((patch: Partial<Selection>) => {
    setSel({ ...DEFAULT_SEL, benefit: sel.benefit, ...patch })
    setTab('explore')
    window.scrollTo({ top: 0 })
  }, [sel.benefit])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      <header className="relative md:sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 pt-4">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-slate-100 tracking-tight">{APP_TITLE}</h1>
              <p className="text-xs text-slate-500 truncate">{APP_SUBTITLE}</p>
            </div>
            <nav className="flex items-center gap-1" aria-label="Views">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  title={t.question}
                  aria-current={tab === t.key ? 'page' : undefined}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200',
                    tab === t.key ? 'bg-[#4A9EFF]/15 text-[#4A9EFF]' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60',
                  )}
                >
                  {t.label}
                </button>
              ))}
              <span className="w-px h-5 bg-slate-800 mx-1" />
              <button
                onClick={() => setAbout(true)}
                className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                title="Open the About panel: source, vintage, build date and known limitations"
              >
                About
              </button>
            </nav>
          </div>
          {/* Permanent chrome — the ceiling caveat. Do not move this to a footnote. */}
          <p className="flex items-center gap-2 py-2.5 text-[13px] text-amber-200/90">
            <span aria-hidden className="inline-block w-1.5 h-1.5 rounded-full bg-amber-300 shrink-0" />
            {CEILING_CAVEAT}
          </p>
        </div>
        {ds && tab !== 'overview' && (
          <div className="border-t border-slate-800/80 bg-slate-900/70">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
              <ControlBar ds={ds} sel={sel} update={update} reset={() => setSel({ ...DEFAULT_SEL, benefit: sel.benefit })} n={filtered.length} />
            </div>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <p className="text-sm text-slate-400 mb-5">{TABS.find((t) => t.key === tab)!.question}</p>
        {err && (
          <div className="rounded-xl border border-red-900 bg-red-950/40 p-5 text-sm text-red-200">
            The catalogue could not be loaded: {err}. Reload the page to try again.
          </div>
        )}
        {!ds && !err && <LoadingSpinner label="Loading 905 PCRT records…" />}
        {ds && tab === 'overview' && <Overview ds={ds} onJump={jumpToExplore} />}
        {ds && tab === 'explore' && <Explore ds={ds} sel={sel} records={filtered} update={update} goEvidence={() => setTab('evidence')} />}
        {ds && tab === 'evidence' && <Evidence ds={ds} sel={sel} records={filtered} />}
      </main>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 pt-4 text-xs text-slate-500 border-t border-slate-900">
        {ds ? (
          <>
            {ds.meta.nRows} records from the ICAR-CRIDA / NICRA state compendia, 19 states/UTs · source {ds.meta.source} (
            {formatDate(ds.meta.sourceModified)}) · no record states its year · effect sizes are intervention ÷ comparator, median and IQR,
            {' '}{MEASURES.netReturn.unit} and {MEASURES.yield.unit} only · built {formatDate(__BUILD_DATE__)}
          </>
        ) : 'PCRT Explorer'}
      </footer>

      {ds && <HowToPanel />}
      {ds && <WelcomeOverlay />}
      {about && ds && <AboutPanel ds={ds} onClose={() => setAbout(false)} />}
    </div>
  )
}
