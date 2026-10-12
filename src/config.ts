// Single source of truth: every label, colour, unit, threshold and `desc` lives here.
// The `desc` strings are the glossary — they feed tooltips, the How-to panel and the
// About panel, so components must import them rather than writing their own copy.

export const APP_SLUG = 'pcrt-explorer'
export const APP_TITLE = 'PCRT Explorer'
export const APP_SUBTITLE = 'Pool of Climate Resilient Technologies — ICAR-CRIDA / NICRA state compendia'

/** Permanent chrome. Shown in the header on every tab; never move it to a footnote. */
export const CEILING_CAVEAT =
  'All results are reported demonstration successes. Treat every figure as a ceiling, not an expectation.'

export const CHART_COLORS = ['#4A9EFF', '#EE6677', '#228833', '#CCBB44', '#66CCEE', '#AA3377', '#BBBBBB']
export const SEQUENTIAL_BLUE = ['#0a1628', '#0f2847', '#143a66', '#1a4d85', '#2060a5', '#2874c5', '#3a8ee5', '#4A9EFF']

/** Evidence tab: one colour per meaning, used nowhere else. */
export const SELECTION_COLOR = '#F5C542' // "your current Explore selection"
export const CATALOGUE_COLOR = '#94A3B8' // "the whole catalogue"

// ---------------------------------------------------------------------------
// Hazard groups. Order and names must match HAZARD_GROUPS in scripts/build_data.py
// (the order defines the groupFlags bits).
// ---------------------------------------------------------------------------
export interface HazardGroupDef {
  key: string
  label: string
  color: string
  /** Offered in the Explore hazard selector as a group. */
  selectable: boolean
  desc: string
}

export const HAZARD_GROUPS: HazardGroupDef[] = [
  {
    key: 'Wet and dry changes', label: 'Wet & dry changes', color: CHART_COLORS[0], selectable: true,
    desc: 'Changes in water supply: moisture stress, drought, flood, excess, erratic or delayed rainfall, and erratic snowfall.',
  },
  {
    key: 'Heat and cold changes', label: 'Heat & cold changes', color: CHART_COLORS[1], selectable: true,
    desc: 'Temperature extremes: heat stress, cold stress, and low winter chilling (a warming-winter effect on fruit crops).',
  },
  {
    key: 'Coastal hazards', label: 'Coastal hazards', color: CHART_COLORS[4], selectable: true,
    desc: 'Cyclone only. All 22 records are in Tamil Nadu and Puducherry. Sea level rise appears nowhere in the catalogue, and no salinity record is coastal (see Soil salinity (inland)).',
  },
  {
    key: 'Soil salinity (inland)', label: 'Soil salinity (inland)', color: CHART_COLORS[5], selectable: true,
    desc: 'Inland salinity and sodicity from irrigation and geology, not seawater intrusion: 21 of 24 records are Uttar Pradesh sub-humid. Kept apart from Coastal hazards deliberately. The rule is written against the AEZ field, so a future coastal salinity record would route to Coastal hazards automatically.',
  },
  {
    key: 'Not hazard-specific', label: 'Not hazard-specific', color: CHART_COLORS[6], selectable: false,
    desc: '"Weather aberration (unspecified)" and "Livelihood and income vulnerability". The second is not a climate hazard at all.',
  },
  {
    key: 'Not stated', label: 'Not stated', color: '#64748B', selectable: false,
    desc: 'The record states no climate vulnerability. Marked as such rather than inferred — mostly Punjab, Kerala and Madhya Pradesh soil-fertility and residue-management records.',
  },
]

export const HAZARD_DESC: Record<string, string> = {
  'Moisture stress': 'Crop water deficit within a season, short of declared drought.',
  Drought: 'Prolonged rainfall deficit.',
  Flood: 'Inundation or waterlogging.',
  'Excess rainfall': 'Rainfall well above normal, without necessarily flooding.',
  'Erratic rainfall': 'Irregular rainfall timing or distribution.',
  'Delayed monsoon': 'Late onset of the south-west monsoon.',
  'Erratic snowfall': 'Irregular snowfall (hill states). Precipitation variability, so grouped with wet and dry.',
  'Heat stress': 'High temperatures, including terminal heat in wheat.',
  'Cold stress': 'Cold waves, frost and low temperatures.',
  'Low winter chilling': 'Too few chill hours for temperate fruit — a warming-winter effect, so grouped with heat and cold.',
  Cyclone: 'Tropical cyclone. The only member of Coastal hazards.',
  Salinity: 'Saline or sodic soils. Every record in this version is inland, not coastal.',
  'Weather aberration (unspecified)': 'The source names no specific hazard.',
  'Livelihood and income vulnerability': 'Not a climate hazard at all; kept so the record is not lost.',
}

/** Multi-hazard reminder shown wherever hazards are counted. */
export const MULTI_HAZARD_NOTE =
  'A record can carry more than one hazard (204 do; 131 span more than one hazard group), so hazard counts add up to more than the record total. Filtering uses the four Yes/No flags, not the "primary" hazard — otherwise cyclone, usually listed second after drought, would show as 1 record instead of 22.'

// ---------------------------------------------------------------------------
// Modules and parent groups
// ---------------------------------------------------------------------------
export const MODULES: Record<string, { label: string; color: string; desc: string }> = {
  'Crop production': { label: 'Crop production', color: '#228833', desc: 'Varieties, sowing, cropping systems, crop protection.' },
  'Natural resource management': { label: 'Natural resource mgmt', color: '#CCBB44', desc: 'Soil and water conservation, water harvesting, nutrient management.' },
  'Animal / livestock': { label: 'Animal / livestock', color: '#C97A2B', desc: 'Breeds, feed and fodder, animal health, fisheries.' },
}

export const PARENT_DESC: Record<string, string> = {
  'Crop varieties and seed systems': 'Stress-tolerant, short-duration or improved varieties, and community seed banks.',
  'Livestock feed and fodder': 'Fodder crops, feed blocks, mineral mixtures, silage and fodder banks.',
  'Water harvesting and irrigation': 'Farm ponds, check dams, recharge structures, micro-irrigation and lifesaving irrigation.',
  'Cropping systems and diversification': 'Intercropping, crop substitution, contingency crops and diversified systems.',
  'In-situ soil and moisture conservation': 'Ridge-furrow, broad-bed furrow, conservation furrows, mulching and bunding.',
  'Livestock breeds and management': 'Improved breeds, housing, animal health and herd management.',
  'Soil fertility and nutrient management': 'Soil-test-based fertilisation, organics, biofertilisers and amendments.',
  'Crop timing and establishment': 'Sowing date, transplanting method, direct seeding and nursery management.',
  'Conservation agriculture and residue management': 'Zero or minimum tillage and in-situ residue retention.',
  'Protected cultivation': 'Poly-houses, low tunnels and shade nets.',
  'Fisheries and integrated farming': 'Fish ponds and integrated crop–livestock–fish systems.',
  'Crop protection': 'Pest and disease management. Only 7 records in the whole catalogue.',
}

/** AEZ groups as atomic values; a record tagged "Semi-arid; Sub-humid" matches both. */
export const AEZ_GROUPS: { key: string; desc: string }[] = [
  { key: 'Arid', desc: 'Arid agro-ecological zones.' },
  { key: 'Semi-arid', desc: 'Semi-arid agro-ecological zones.' },
  { key: 'Sub-humid', desc: 'Sub-humid agro-ecological zones.' },
  { key: 'Humid and per-humid', desc: 'Humid and per-humid zones (mostly the north-east and hills).' },
  { key: 'Coastal', desc: 'Coastal agro-ecological zones.' },
]
export const AEZ_FILTER_DESC =
  'Some records span several AEZ groups (e.g. "Semi-arid; Sub-humid"); they match each group they list. 10 records have no AEZ.'

// ---------------------------------------------------------------------------
// Evidence tiers — by number of records behind a technology in the current selection.
// ---------------------------------------------------------------------------
export interface TierDef { key: string; label: string; min: number; max: number; color: string; desc: string }

export const TIERS: TierDef[] = [
  { key: 'single', label: 'Single report', min: 1, max: 2, color: SEQUENTIAL_BLUE[3], desc: '1–2 records. An anecdote, not a pattern.' },
  { key: 'very-limited', label: 'Very limited', min: 3, max: 4, color: SEQUENTIAL_BLUE[4], desc: '3–4 records. Records are shown individually; no median is computed.' },
  { key: 'limited', label: 'Limited', min: 5, max: 9, color: SEQUENTIAL_BLUE[5], desc: '5–9 records. A median is shown, but it may rest on one or two source tables.' },
  { key: 'moderate', label: 'Moderate', min: 10, max: 24, color: SEQUENTIAL_BLUE[6], desc: '10–24 records.' },
  { key: 'substantial', label: 'Substantial', min: 25, max: Infinity, color: SEQUENTIAL_BLUE[7], desc: '25 or more records. Still reported successes: more records make the ceiling better-documented, not lower.' },
]

/** Below this many usable values a median is not shown — the values are listed instead. */
export const MIN_N_FOR_MEDIAN = 5

// ---------------------------------------------------------------------------
// Outcome measures (log response ratios, always displayed back-transformed)
// ---------------------------------------------------------------------------
export type MeasureKey = 'netReturn' | 'yield' | 'bc' | 'cost'

export interface MeasureDef {
  key: MeasureKey
  label: string
  short: string
  /** Required unit for both arms; null = unitless ratio. */
  unit: string | null
  benefit: boolean
  desc: string
}

export const MEASURES: Record<MeasureKey, MeasureDef> = {
  netReturn: {
    key: 'netReturn', label: 'Net return', short: 'Net return', unit: 'Rs/ha', benefit: true,
    desc: 'Intervention net return ÷ comparator net return, Rs/ha records only. Records reported per animal, per unit or per acre are excluded — the source gives no stocking rates to convert them.',
  },
  yield: {
    key: 'yield', label: 'Yield', short: 'Yield', unit: 'q/ha', benefit: true,
    desc: 'Intervention yield ÷ comparator yield, q/ha records only. Milk, per-animal and per-plant yields are excluded.',
  },
  bc: {
    key: 'bc', label: 'B:C ratio', short: 'B:C', unit: null, benefit: true,
    desc: 'Intervention benefit–cost ratio ÷ comparator benefit–cost ratio. Unitless, so all records with both arms are used.',
  },
  cost: {
    key: 'cost', label: 'Cost of cultivation', short: 'Cost', unit: 'Rs/ha', benefit: false,
    desc: 'Intervention cost ÷ comparator cost, Rs/ha records only. Shown beside the benefit, never netted against it. Positive means the technology costs more.',
  },
}

export const BENEFIT_MEASURES: MeasureKey[] = ['netReturn', 'yield', 'bc']
export const DEFAULT_BENEFIT: MeasureKey = 'netReturn'
export const DEFAULT_BENEFIT_WHY =
  'Net return is the default because it already folds in both yield and cost, and it is the outcome a farmer acts on.'

export const EFFECT_METHOD_DESC =
  'Each record is compared with its own comparator as a ratio (intervention ÷ comparator), combined across records on a log scale and shown back as "1.5×" / "+51%". Summaries are the median and interquartile range (middle half of records), not the mean, because the ratios are right-skewed. Records where either arm is zero or negative are dropped rather than offset.'

// ---------------------------------------------------------------------------
// Completeness fields (Evidence tab)
// ---------------------------------------------------------------------------
export const COMPLETENESS_FIELDS: { key: string; label: string; desc: string }[] = [
  { key: 'crop', label: 'Crop / animal', desc: 'The record names the crop or animal.' },
  { key: 'hazard', label: 'Hazard', desc: 'The record states a climate vulnerability.' },
  { key: 'aez', label: 'AEZ', desc: 'The record carries an agro-ecological zone.' },
  { key: 'district', label: 'District', desc: 'The record names a district.' },
  { key: 'netReturn', label: 'Net return pair (Rs/ha)', desc: 'Both intervention and comparator net return, in Rs/ha, both positive.' },
  { key: 'yield', label: 'Yield pair (q/ha)', desc: 'Both intervention and comparator yield, in q/ha, both positive.' },
  { key: 'cost', label: 'Cost pair (Rs/ha)', desc: 'Both intervention and comparator cost of cultivation, in Rs/ha.' },
  { key: 'year', label: 'Year', desc: 'No record states the year of the demonstration, so rupee values cannot be deflated or compared across time.' },
]

// ---------------------------------------------------------------------------
// About panel
// ---------------------------------------------------------------------------
export const SOURCE_DESC =
  'Pool of Climate Resilient Technologies (PCRT), compiled from the ICAR-CRIDA / NICRA (National Innovations in Climate Resilient Agriculture) state compendia for 19 states and union territories. Records were extracted from the compendia, each technology title was mapped to 59 harmonised technologies in 12 parent groups, and climate vulnerabilities were split into 14 hazard tokens in four hazard groups.'

export const LIMITATIONS: string[] = [
  'This is a record of reported successes, not a sample of outcomes. Demonstrations were chosen for the compendia because they worked. Every benefit figure is an upper bound on what to expect, not an estimate of it.',
  'No record states its year, so rupee values cannot be deflated. Net returns from different years are compared as if they were the same money.',
  'Coverage is uneven. Uttar Pradesh, Madhya Pradesh and Maharashtra together hold 39% of records; Puducherry has 1 and Ladakh 4. An empty cell usually means "not documented", not "does not work".',
  'Crop protection has 7 records. Coastal hazards has 22, all cyclone, all in Tamil Nadu and Puducherry. Sea level rise appears nowhere.',
  'Salinity is inland (21 of 24 records in Uttar Pradesh sub-humid), not coastal intrusion, and is kept as its own group.',
  'Rupee comparisons use Rs/ha records only and yield comparisons use q/ha only. Per-animal, per-unit and per-acre records are shown in the detail panel but excluded from every summary.',
  'Records are not independent: several often come from one source table in one compendium. The record count overstates the number of independent pieces of evidence.',
  '39 records state no climate vulnerability. They appear under "All hazards" only, never under an inferred hazard.',
]

export const HOW_TO_USE: { action: string; result: string }[] = [
  { action: 'Pick a hazard and a state', result: 'Explore lists the technologies PCRT documents for that combination, most-recorded first.' },
  { action: 'Click a technology', result: 'Opens the individual records behind it, with the text as printed in the compendium.' },
  { action: 'Click a tier in the legend', result: 'Shows only technologies at that evidence tier. Click again to show all.' },
  { action: 'Open Evidence', result: 'Shows how far to trust the numbers for your current selection against the whole catalogue.' },
  { action: 'Click a heatmap cell in Overview', result: 'Jumps to Explore with that state or hazard selected.' },
]
