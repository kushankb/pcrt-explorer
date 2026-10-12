import { CEILING_CAVEAT, EFFECT_METHOD_DESC, HAZARD_GROUPS, LIMITATIONS, MIN_N_FOR_MEDIAN, SOURCE_DESC, TIERS } from '../config'
import type { Dataset } from '../utils/data'
import { formatDate } from '../utils/formatters'
import { Modal } from './shared/ui'

export function AboutPanel({ ds, onClose }: { ds: Dataset; onClose: () => void }) {
  return (
    <Modal onClose={onClose} labelledBy="about-title">
      <div className="flex items-start justify-between gap-4">
        <h2 id="about-title" className="text-lg font-semibold text-slate-100">About this explorer</h2>
        <button onClick={onClose} className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100" title="Close (Esc)">✕</button>
      </div>
      <p className="text-sm text-amber-200/90 mt-3">{CEILING_CAVEAT}</p>

      <Section title="Source">
        <p>{SOURCE_DESC}</p>
        <dl className="grid grid-cols-[150px_1fr] gap-x-3 gap-y-1 mt-3 text-xs">
          <dt className="text-slate-500">Data file</dt><dd className="text-slate-300">{ds.meta.source}, sheet "{ds.meta.sheet}"</dd>
          <dt className="text-slate-500">Classification vintage</dt><dd className="text-slate-300">v4, harmonised classification · file dated {formatDate(ds.meta.sourceModified)}</dd>
          <dt className="text-slate-500">Payload generated</dt><dd className="text-slate-300">{formatDate(ds.meta.generated)}</dd>
          <dt className="text-slate-500">App built</dt><dd className="text-slate-300">{formatDate(__BUILD_DATE__)}</dd>
          <dt className="text-slate-500">Records</dt><dd className="text-slate-300">{ds.meta.nRows} · {ds.states.length} states/UTs · {ds.parents.length} parent groups · {ds.techs.length} technologies · {ds.hazards.length} hazards</dd>
        </dl>
      </Section>

      <Section title="How effects are calculated">
        <p>{EFFECT_METHOD_DESC}</p>
        <p className="mt-2">Below {MIN_N_FOR_MEDIAN} usable values no median is shown; the individual values are listed instead.</p>
      </Section>

      <Section title="Evidence tiers">
        <ul className="space-y-1">
          {TIERS.map((t) => (
            <li key={t.key} className="flex gap-2">
              <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: t.color }} />
              <span><span className="text-slate-200">{t.label}</span> — {t.desc}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Hazard groups">
        <ul className="space-y-1.5">
          {HAZARD_GROUPS.map((g) => (
            <li key={g.key} className="flex gap-2">
              <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: g.color }} />
              <span><span className="text-slate-200">{g.label}</span> — {g.desc}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Known limitations">
        <ul className="list-disc pl-5 space-y-1.5">
          {LIMITATIONS.map((l) => <li key={l}>{l}</li>)}
        </ul>
      </Section>
    </Modal>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 text-sm text-slate-400 leading-relaxed">
      <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">{title}</h3>
      {children}
    </section>
  )
}
