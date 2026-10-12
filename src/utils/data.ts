// Payload decoding. ROW must match the index map in scripts/build_data.py.
import { AEZ_GROUPS, HAZARD_GROUPS, MEASURES, type MeasureKey } from '../config'

export const ROW = {
  id: 0, state: 1, district: 2, aezName: 3, aezGroup: 4, module: 5, crop: 6, tech: 7,
  secondary: 8, title: 9, hazardMask: 10, groupFlags: 11, primaryGroup: 12,
  intervention: 13, comparator: 14,
  netReturn: 15, cmpNetReturn: 16, returnUnit: 17,
  cost: 18, cmpCost: 19, costUnit: 20,
  yield: 21, cmpYield: 22, yieldUnit: 23,
  bc: 24, cmpBc: 25, note: 26,
} as const

interface RawPayload {
  meta: {
    source: string; sheet: string; sourceModified: string; generated: string
    nRows: number; nColumnsInSource: number
  }
  dims: {
    states: string[]; districts: string[]; aezNames: string[]; aezGroups: string[]
    modules: string[]; crops: string[]; secondaries: string[]; titles: string[]
    texts: string[]; units: string[]; parents: string[]
    techs: { name: string; parent: number }[]
    hazardGroups: string[]
    hazards: { name: string; group: number }[]
  }
  rows: (string | number | null)[][]
}

export interface Arm { i: number | null; c: number | null; unit: string | null }

export interface PcrtRecord {
  id: string
  state: string
  district: string | null
  aezName: string | null
  aezGroup: string | null
  /** Atomic AEZ groups this record belongs to. */
  aezAtoms: string[]
  module: string
  crop: string | null
  tech: string
  parent: string
  secondary: string | null
  title: string
  hazards: string[]
  hazardMask: number
  groupFlags: number
  primaryGroup: string
  intervention: string | null
  comparator: string | null
  note: string | null
  arms: Record<MeasureKey, Arm>
  /** ln(intervention ÷ comparator), null where the unit or sign rules exclude the record. */
  lnrr: Record<MeasureKey, number | null>
}

export interface Dataset {
  meta: RawPayload['meta']
  states: string[]
  parents: string[]
  techs: { name: string; parent: string }[]
  modules: string[]
  hazards: { name: string; group: number; bit: number }[]
  records: PcrtRecord[]
}

function lnrr(arm: Arm, unit: string | null): number | null {
  if (arm.i == null || arm.c == null) return null
  if (unit != null && arm.unit !== unit) return null
  if (arm.i <= 0 || arm.c <= 0) return null // drop non-positive arms, never offset
  return Math.log(arm.i / arm.c)
}

function decode(raw: RawPayload): Dataset {
  const d = raw.dims
  const s = (arr: string[], i: unknown) => (typeof i === 'number' && i >= 0 ? arr[i] : null)
  const n = (v: unknown) => (typeof v === 'number' ? v : null)
  if (d.hazardGroups.join('|') !== HAZARD_GROUPS.map((g) => g.key).join('|')) {
    throw new Error('Hazard groups in payload do not match src/config.ts — rebuild the data or update config.')
  }

  const records: PcrtRecord[] = raw.rows.map((r) => {
    const mask = r[ROW.hazardMask] as number
    const aezGroup = s(d.aezGroups, r[ROW.aezGroup])
    const tech = d.techs[r[ROW.tech] as number]
    const arms: Record<MeasureKey, Arm> = {
      netReturn: { i: n(r[ROW.netReturn]), c: n(r[ROW.cmpNetReturn]), unit: s(d.units, r[ROW.returnUnit]) },
      cost: { i: n(r[ROW.cost]), c: n(r[ROW.cmpCost]), unit: s(d.units, r[ROW.costUnit]) },
      yield: { i: n(r[ROW.yield]), c: n(r[ROW.cmpYield]), unit: s(d.units, r[ROW.yieldUnit]) },
      bc: { i: n(r[ROW.bc]), c: n(r[ROW.cmpBc]), unit: null },
    }
    return {
      id: r[ROW.id] as string,
      state: d.states[r[ROW.state] as number],
      district: s(d.districts, r[ROW.district]),
      aezName: s(d.aezNames, r[ROW.aezName]),
      aezGroup,
      aezAtoms: aezGroup ? aezGroup.split(';').map((x) => x.trim()).filter((x) => AEZ_GROUPS.some((g) => g.key === x)) : [],
      module: d.modules[r[ROW.module] as number],
      crop: s(d.crops, r[ROW.crop]),
      tech: tech.name,
      parent: d.parents[tech.parent],
      secondary: s(d.secondaries, r[ROW.secondary]),
      title: d.titles[r[ROW.title] as number],
      hazards: d.hazards.filter((_, i) => mask & (1 << i)).map((h) => h.name),
      hazardMask: mask,
      groupFlags: r[ROW.groupFlags] as number,
      primaryGroup: d.hazardGroups[r[ROW.primaryGroup] as number],
      intervention: s(d.texts, r[ROW.intervention]),
      comparator: s(d.texts, r[ROW.comparator]),
      note: s(d.texts, r[ROW.note]),
      arms,
      lnrr: {
        netReturn: lnrr(arms.netReturn, MEASURES.netReturn.unit),
        cost: lnrr(arms.cost, MEASURES.cost.unit),
        yield: lnrr(arms.yield, MEASURES.yield.unit),
        bc: lnrr(arms.bc, MEASURES.bc.unit),
      },
    }
  })

  return {
    meta: raw.meta,
    states: [...d.states].sort(),
    parents: d.parents,
    techs: d.techs.map((t) => ({ name: t.name, parent: d.parents[t.parent] })),
    modules: d.modules,
    hazards: d.hazards.map((h, i) => ({ ...h, bit: i })),
    records,
  }
}

// Module-level cache: fetched once per page load, shared by every view.
let cache: Promise<Dataset> | null = null

export function loadDataset(): Promise<Dataset> {
  if (!cache) {
    cache = fetch(`${import.meta.env.BASE_URL}data/pcrt.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`Could not load data (HTTP ${r.status})`)
        return r.json() as Promise<RawPayload>
      })
      .then(decode)
      .catch((e) => {
        cache = null
        throw e
      })
  }
  return cache
}

// ---------------------------------------------------------------------------
// Selection (shared state across Explore and Evidence)
// ---------------------------------------------------------------------------
export type HazardSel =
  | { kind: 'all' }
  | { kind: 'group'; index: number }
  | { kind: 'token'; bit: number }

export interface Selection {
  hazard: HazardSel
  state: string | null // null = All India
  aez: string | null
  module: string | null
  benefit: MeasureKey
}

export function matches(r: PcrtRecord, sel: Selection): boolean {
  if (sel.state && r.state !== sel.state) return false
  if (sel.module && r.module !== sel.module) return false
  if (sel.aez && !r.aezAtoms.includes(sel.aez)) return false
  const h = sel.hazard
  if (h.kind === 'group' && !(r.groupFlags & (1 << h.index))) return false
  if (h.kind === 'token' && !(r.hazardMask & (1 << h.bit))) return false
  return true
}

export function hazardLabel(sel: HazardSel, ds: Dataset): string {
  if (sel.kind === 'all') return 'All hazards'
  if (sel.kind === 'group') return HAZARD_GROUPS[sel.index].label
  return ds.hazards[sel.bit].name
}

export function selectionLabel(sel: Selection, ds: Dataset): string {
  const parts = [hazardLabel(sel.hazard, ds), sel.state ?? 'All India']
  if (sel.aez) parts.push(sel.aez)
  if (sel.module) parts.push(sel.module)
  return parts.join(' · ')
}
