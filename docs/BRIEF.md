# Brief — PCRT Explorer

**The one question:** I'm in this state facing this hazard — what does PCRT suggest, and
how far should I trust it?

**Audience:** FAO / NITI Aayog analysts and state agriculture planners who know the
domain but have not seen PCRT.

**Data contract:** `PCRT_dataset_v4_classified_KB.xlsx` (240 KB, 905 × 48) →
`scripts/build_data.py` → `public/data/pcrt.json` (179 KB, arrays-of-arrays with interned
dims) → fetched once and cached.

| View | Question |
|---|---|
| Overview | What is in this catalogue, and how is it classified? |
| Explore | I'm in this state facing this hazard — what does PCRT suggest? |
| Evidence | How much should I trust what Explore just told me? |

**Uncertainty and provenance:** Effect = log response ratio, displayed back-transformed;
median + IQR + n; no median below 5 values; evidence tier by record count. The IQR is the
spread of reported successes, not a confidence interval. Ceiling caveat is permanent chrome.

**Non-goals:** ranking technologies by effectiveness; netting benefit against cost;
converting per-animal to per-hectare; inferring hazards or years that the source does not
state; a map (state is the finest consistent unit, and districts are 85% complete).
