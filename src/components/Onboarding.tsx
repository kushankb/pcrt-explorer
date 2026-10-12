import { useState } from 'react'
import { APP_SLUG, CEILING_CAVEAT, HOW_TO_USE } from '../config'
import { useOnceFlag } from './shared/ui'

/** Layer 1: shown once, dismissed by clicking anywhere. */
export function WelcomeOverlay() {
  const [done, mark] = useOnceFlag(`${APP_SLUG}-onboarded`)
  if (done) return null
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 cursor-pointer"
      onClick={mark}
      role="dialog"
      aria-label="Welcome"
    >
      <div className="fade-in max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-7 shadow-2xl">
        <p className="text-xs uppercase tracking-wider text-[#4A9EFF] font-medium">PCRT Explorer</p>
        <h2 className="text-xl font-semibold text-slate-100 mt-2 leading-snug">
          905 reported field demonstrations of 59 climate-resilient farming technologies, from the ICAR-CRIDA / NICRA compendia for 19 states and UTs.
        </h2>
        <p className="text-sm text-slate-300 mt-3">
          Pick a <b>hazard</b> and a <b>state</b> in Explore to see what has been documented there, and how many records stand behind each technology.
        </p>
        <p className="text-sm text-amber-200/90 mt-3">{CEILING_CAVEAT}</p>
        <p className="text-xs text-slate-500 mt-5">Click anywhere to start.</p>
      </div>
    </div>
  )
}

/** Layer 3: always available, collapsed by default, bottom-left. */
export function HowToPanel() {
  const [open, setOpen] = useState(false)
  return (
    <div className="fixed bottom-4 left-4 z-30 max-w-sm">
      {open && (
        <div className="fade-in mb-2 rounded-xl border border-slate-700 bg-slate-900/95 backdrop-blur p-4 shadow-2xl">
          <ul className="space-y-2.5">
            {HOW_TO_USE.map((h) => (
              <li key={h.action} className="text-xs leading-relaxed">
                <span className="text-slate-100 font-medium">{h.action}</span>
                <span className="text-slate-500"> → </span>
                <span className="text-slate-400">{h.result}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="rounded-full border border-slate-700 bg-slate-900/95 px-3.5 py-1.5 text-xs font-medium text-slate-300 shadow-lg hover:border-slate-500 hover:text-slate-100"
        title={open ? 'Hide the how-to panel' : 'Show how to use this explorer'}
      >
        ① How to use
      </button>
    </div>
  )
}
