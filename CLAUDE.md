# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in
this repository.

## Project Overview

**PCRT Explorer** — a three-tab dashboard over the Pool of Climate Resilient Technologies:
905 reported demonstration records (59 harmonised technologies, 12 parent groups, 14
hazards, 19 Indian states/UTs) from the ICAR-CRIDA / NICRA state compendia, classification
v4 (Oct 2026). Built for FAO / NITI Aayog work on climate-resilient agriculture.

The database is **a record of reported successes, not a sample of outcomes**. The honesty
features (ceiling caveat in the header, n beside every median, evidence tiers, no median
below 5 values, gaps stated as findings) are the point of the app — do not remove or
soften them.

Deployed at https://kushankbajaj.com/pcrt-explorer/ from `main` via GitHub Pages.

## Commands

```bash
npm run dev       # Vite dev server — http://localhost:5173/pcrt-explorer/
npm run build     # tsc -b + production build → dist/
npm run preview   # Serve dist/ at the real base path
npm run lint      # Type-check only (tsc -b --noEmit); there is no ESLint config
npm run data      # python3 scripts/build_data.py → public/data/pcrt.json
```

## Stack

- **React 18** function components + hooks; no state library
- **TypeScript 5.8**, **Vite 6**, **Tailwind CSS 4** via `@tailwindcss/vite`
- **Recharts 2** for the scatter and bar chart; the classification bars and heatmaps are
  hand-rolled divs so every bar/cell is a keyboard-reachable button

## Architecture

### Views

| Tab (hash `tab=`) | File | Question it answers |
|---|---|---|
| `overview` | `src/components/views/Overview.tsx` | What is in this catalogue, and how is it classified? |
| `explore` (default) | `src/components/views/Explore.tsx` + `DetailPanel.tsx` | I'm in this state facing this hazard — what does PCRT suggest? |
| `evidence` | `src/components/views/Evidence.tsx` | How much should I trust what Explore just told me? |

### Components

| File | Role |
|---|---|
| `src/App.tsx` | Shell: sticky header + ceiling caveat, tabs, shared `Selection` state, URL-hash sync |
| `src/components/ControlBar.tsx` | Hazard / state / AEZ / module / benefit-measure filters, with live counts per option |
| `src/components/AboutPanel.tsx` | Source, vintage, build date, method, tiers, hazard groups, limitations |
| `src/components/Onboarding.tsx` | Welcome overlay (`pcrt-explorer-onboarded`) and "① How to use" panel |
| `src/components/shared/ui.tsx` | `StatCard`, `ChartContainer`, `LoadingSpinner`, `InfoTip`, `Badge`, `Select`, `Hint`, `Modal`, `clickable()`, `useOnceFlag()` |
| `src/components/shared/Effect.tsx` | The one way an effect is displayed: median + IQR + n, or the individual values when n < 5 |

Contextual hints live in `Explore.tsx` (`pcrt-explorer-hint-hazard`, then
`pcrt-explorer-hint-row`), each dismissed by the action it teaches.

### Single source of truth

`src/config.ts` owns every label, colour, threshold (`MIN_N_FOR_MEDIAN`, `TIERS`), measure
definition and `desc` string, plus the caveat, About and How-to copy. Components import from
it; never write copy or colours inline. All numbers go through `src/utils/formatters.ts`.
Effect sizes are ln ratios internally and must only ever be shown via `formatPctChange` /
`formatRatio` — never print a log.

Colour meanings (one meaning each): hazard groups in `HAZARD_GROUPS`; modules in
`MODULES`; evidence tiers and heatmaps use `SEQUENTIAL_BLUE` (more records = brighter);
`SELECTION_COLOR` amber = "your Explore selection", `CATALOGUE_COLOR` slate = "whole
catalogue" (Evidence tab only). `#4A9EFF` is also the UI accent (tabs, links, focus rings).

### Data

| File | Shape | Built by |
|---|---|---|
| `public/data/pcrt.json` (~179 KB) | `{ meta, dims, rows }`, rows as arrays-of-arrays, strings interned in `dims` | `scripts/build_data.py` from `PCRT_dataset_v4_classified_KB.xlsx` (OneDrive `India_NITIAayog_KB/Documents/Output3_interventions/`) |

The row index map is documented at the top of `scripts/build_data.py` and must match `ROW`
in `src/utils/data.ts`. `hazardMask` is a bitmask over `dims.hazards`; `groupFlags` is a
bitmask over `dims.hazardGroups` built from the four Yes/No flag columns. **Filter hazards
on these flags, never on `primaryGroup`** (cyclone would drop from 22 to 1).
`HAZARD_GROUPS` order in the Python script and `src/config.ts` must agree; `decode()`
throws if they don't.

`loadDataset()` fetches once via `import.meta.env.BASE_URL` and caches the promise at
module level. Every filter is a client-side lookup.

Some figures in `config.ts` copy (`LIMITATIONS`, `MULTI_HAZARD_NOTE`, hazard-group `desc`)
are written for v4 data. The Overview "What is missing" panel and the Evidence numbers are
computed live. **After rebuilding the data, re-check the static copy.**

## Deployment

`.github/workflows/deploy.yml` → GitHub Pages (Actions) on every push to `main`. Base path
is `base: '/pcrt-explorer/'` in `vite.config.ts`; `public/.nojekyll` is copied into
`dist/`. No secrets or env vars are needed.

## House rules

- No backend, no runtime computation that Python could do once at build time.
- Every median carries its n and is suppressed below `MIN_N_FOR_MEDIAN`; every technology row
  carries an evidence tier.
- Benefit and cost sit side by side, never netted into one number.
- Rupee measures use Rs/ha only, yield uses q/ha only; never pool per-hectare with per-animal values.
- The ceiling caveat stays in the header on every tab.
- Update this file and `README.md` in the same commit as any architectural change.
