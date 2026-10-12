# PCRT Explorer

A React + TypeScript + Vite + Recharts dashboard for the **Pool of Climate Resilient
Technologies (PCRT)** — 905 reported field demonstrations of 59 harmonised technologies
(12 parent groups) against 14 climate hazards, compiled from the ICAR-CRIDA / NICRA state
compendia for 19 Indian states and union territories. It answers one practical question —
*I'm in this state facing this hazard: what does PCRT suggest, and how far should I trust
it?*

Deployed via GitHub Pages to [kushankbajaj.com/pcrt-explorer](https://kushankbajaj.com/pcrt-explorer/).

> **Every figure in this app is a reported demonstration success. Read it as a ceiling,
> not an expectation.** 99.3% of paired net-return records show the technology beating
> its comparator. That is not because the technologies never fail; it is because the
> compendia report demonstrations that worked. See [Known limitations](#known-limitations).

## What it shows

- **Overview** — *What is in this catalogue, and how is it classified?* Stat cards, a
  "What is missing" panel that states the gaps as findings (crop protection has 7
  records; coastal hazards are 22 cyclone records from Tamil Nadu and Puducherry only; sea
  level rise is absent; no record has a year), the classification scheme as a stacked bar
  chart you can drill into, and two coverage heatmaps (state × parent group, hazard ×
  parent group). Clicking a heatmap cell opens Explore for that state or hazard.
- **Explore** — *I'm in this state facing this hazard — what does PCRT suggest?* The
  technologies documented for a hazard × state (× AEZ group × module) selection, ranked
  by record count. Each row shows the record count, the median benefit with its
  interquartile range and n, the median cost change, and an evidence tier. Clicking a row
  opens the individual records with their verbatim titles and the intervention and
  comparator text as printed. Empty combinations say so and suggest where the hazard *is*
  documented.
- **Evidence** — *How much should I trust what Explore just told me?* The selection
  diagnostic (log–log scatter of intervention vs comparator net return, with the line of
  equality), share of pairs where the intervention is higher for each measure, field
  completeness, and a short guide to reading the numbers. Your current Explore selection is
  highlighted against the whole catalogue throughout.

The filters (hazard, state, AEZ group, module, benefit measure) are shared between
Explore and Evidence, and the selection is kept in the URL hash, so a pasted link restores
it. Changing a filter never triggers a network request: the whole catalogue (179 KB) is
fetched once on load, and all filtering and statistics run in the browser.

## Time coverage

None. **No record in the source states the year of the demonstration.** The compendia
were compiled in the NICRA era, but individual records cannot be dated, so rupee values
cannot be deflated and nothing can be said about change over time. The app has no year
control for this reason, not by omission.

## Effect sizes

| Internal key | Displayed as | Definition |
|---|---|---|
| `netReturn` | Net return (Rs/ha) — **default** | ln(intervention net return ÷ comparator net return), Rs/ha records only |
| `yield` | Yield (q/ha) | ln(intervention yield ÷ comparator yield), q/ha records only |
| `bc` | B:C ratio | ln(intervention B:C ÷ comparator B:C), all records with both arms |
| `cost` | Cost change (Rs/ha) | ln(intervention cost ÷ comparator cost), Rs/ha records only; always shown *beside* the benefit, never netted |

- Log response ratios are **always displayed back-transformed** ("1.5×", "+51%"). No log
  value appears in the UI.
- Summaries are the **median and interquartile range**, not mean and SD, because the
  ratios stay right-skewed after the log.
- Records where either arm is zero or negative are **dropped, not offset**.
- Per-hectare values are never pooled with per-animal, per-unit or per-acre values; the
  source gives no stocking rates to convert them. Those records still appear in the detail
  panel, marked as excluded.
- **Below 5 usable values no median is shown** — the individual values are listed instead.
- Net return is the default benefit because it already combines yield and cost and is the
  outcome a farmer acts on.

The interquartile range is the spread of *reported successes* across records. It is not
a confidence interval, and it does not describe what happens to a typical adopter.

**Evidence tiers** (by records behind a technology in the current selection): 1–2 single
report · 3–4 very limited · 5–9 limited · 10–24 moderate · 25+ substantial.

**Hazard groups.** The 14 hazard tokens are grouped into Wet & dry changes, Heat & cold
changes, Coastal hazards and Soil salinity (inland), plus residual *Not hazard-specific*
and *Not stated*. Filtering uses the four Yes/No flag columns, not *Hazard group –
primary*. 204 records list more than one hazard (131 span more than one group), and cyclone
is usually listed second after drought, so filtering on the primary column would show
cyclone as 1 record instead of 22. Salinity is kept out of Coastal hazards on purpose:
none of the 24 salinity records is coastal (21 are Uttar Pradesh sub-humid sodicity).

## Data pipeline

```
PCRT_dataset_v4_classified_KB.xlsx   (OneDrive: India_NITIAayog_KB/Documents/Output3_interventions/)
  sheets: Classified_dataset (905 × 48), Hazard_mapping, README, Summary
      │
      └── scripts/build_data.py   → public/data/pcrt.json  (~179 KB)
                                        │
                                        ▼
                            src/utils/data.ts  (fetch once, decode, cache at module level)
```

`pcrt.json` stores rows as **arrays of arrays** with strings interned into dimension
tables (`dims.states`, `dims.techs`, `dims.hazards`, …). Hazards are a bitmask over
`dims.hazards`; hazard-group membership is a second bitmask over `dims.hazardGroups`. The
index map is documented at the top of `scripts/build_data.py` and must match `ROW` in
`src/utils/data.ts`.

### Rebuilding the data

```bash
python3 scripts/build_data.py                     # default: the OneDrive path above
python3 scripts/build_data.py path/to/file.xlsx   # or any other copy
```

Needs Python 3 with `pandas` and `openpyxl`. Runs in about a second and overwrites
`public/data/pcrt.json`. The script stops if a hazard token in the data is missing from
the `Hazard_mapping` sheet.

## Development

```bash
npm install
npm run dev        # http://localhost:5173/pcrt-explorer/
npm run build      # type-check + production build → dist/
npm run preview    # serve dist/ at the real base path
npm run lint       # type-check only
```

Deployment is automatic via `.github/workflows/deploy.yml` on every push to `main`
(GitHub Pages, base path `/pcrt-explorer/`).

## Known limitations

Characteristics of the **data**:

- **This is a record of reported successes, not a sample of outcomes.** 558 of 562 usable
  net-return pairs, 98.9% of B:C pairs and 96.7% of yield pairs favour the intervention,
  while cost — which nobody selects on — is higher in only 69.3%. Every benefit figure is
  an upper bound, and a median "+50%" should never be quoted as an expected gain.
- **No record states its year.** Rupee values from different seasons are compared as if
  they were the same money.
- **Records are not independent.** Several records often come from one table in one
  compendium. The record count, and therefore the evidence tier, overstates the number of
  independent pieces of evidence.
- **Coverage is very uneven.** Uttar Pradesh, Madhya Pradesh and Maharashtra hold 39% of
  records; Puducherry has 1, Ladakh 4. An empty cell means "not documented", not "does
  not work".
- **Whole hazards are thin or missing.** Crop protection: 7 records. Coastal hazards: 22,
  all cyclone, all Tamil Nadu and Puducherry. Sea level rise: none. Coastal salinity
  intrusion: none.
- **Comparators are not standardised.** "Farmers' practice" differs by state and
  season; ratios against different baselines are pooled.
- 39 records state no climate vulnerability; 15% name no district.

Consequences of **scoping decisions** in this app:

- Only Rs/ha and q/ha records enter rupee and yield summaries (566 of the 671 records
  with both net-return arms are in Rs/ha). Livestock technologies reported per animal therefore rarely get a
  benefit figure even when they have many records.
- The evidence tier counts *records*, but a median rests only on records with a usable
  pair, which can be far fewer (e.g. 78 fodder records, 10 usable net-return pairs). The n
  beside every median is the number to read.
- Records listing several hazards count once under each, so the same demonstration can
  support a technology under drought and under heat stress.
- The `Hazard_mapping` sheet in the source lists 0 rows for "Weather aberration
  (unspecified)"; the data has 16. The app counts from the data.

## Citation / source

Data: Pool of Climate Resilient Technologies, extracted from the ICAR-Central Research
Institute for Dryland Agriculture (CRIDA) / National Innovations in Climate Resilient
Agriculture (NICRA) state compendia (19 states/UTs). Harmonised classification v4
(`PCRT_dataset_v4_classified_KB.xlsx`, October 2026).

Tool: Kushank Bajaj, *PCRT Explorer* (2026), https://kushankbajaj.com/pcrt-explorer/.
