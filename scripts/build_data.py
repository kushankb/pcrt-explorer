"""Build public/data/pcrt.json from the classified PCRT spreadsheet.

Usage:
    python3 scripts/build_data.py [path/to/PCRT_dataset_v4_classified_KB.xlsx]

Re-run whenever the spreadsheet changes. The row index map below MUST match
ROW in src/utils/data.ts.

Row index map (each record is one array):
    0  id               Database ID (string)
    1  state            -> dims.states
    2  district         -> dims.districts      (-1 = not stated)
    3  aezName          -> dims.aezNames       (-1)
    4  aezGroup         -> dims.aezGroups      (-1)
    5  module           -> dims.modules
    6  crop             -> dims.crops          (-1)
    7  tech             -> dims.techs          (harmonised; parent via techs[i].parent)
    8  secondary        -> dims.secondaries    (-1)
    9  title            -> dims.titles         (verbatim technology title)
    10 hazardMask       bit i set = record lists dims.hazards[i]
    11 groupFlags       bit i set = record touches dims.hazardGroups[i]
                        (from the four Yes/No flag columns, plus the residual groups)
    12 primaryGroup     -> dims.hazardGroups   ("Hazard group - primary")
    13 intervention     -> dims.texts          (-1)  "Intervention (as printed)"
    14 comparator       -> dims.texts          (-1)  "Comparator (as printed or named)"
    15 netReturn, 16 cmpNetReturn, 17 returnUnit -> dims.units (-1)
    18 cost,      19 cmpCost,      20 costUnit   -> dims.units (-1)
    21 yield,     22 cmpYield,     23 yieldUnit  -> dims.units (-1)
    24 bc,        25 cmpBc
    26 note             -> dims.texts          (-1)  "Classification note"
"""

import json
import math
import re
import sys
from datetime import date, datetime
from pathlib import Path

import pandas as pd

DEFAULT_SRC = Path(
    "/Users/kushankbajaj/Library/CloudStorage/OneDriveFileProvider-FoodandAgricultureOrganization/"
    "India_NITIAayog_KB/Documents/Output3_interventions/PCRT_dataset_v4_classified_KB.xlsx"
)
OUT = Path(__file__).resolve().parent.parent / "public" / "data" / "pcrt.json"

# Order defines the groupFlags bits. Keys must match HAZARD_GROUPS in src/config.ts.
HAZARD_GROUPS = [
    ("Wet and dry changes", "Wet and dry changes?"),
    ("Heat and cold changes", "Heat and cold changes?"),
    ("Coastal hazards", "Coastal hazards?"),
    ("Soil salinity (inland)", "Soil salinity (inland)?"),
    ("Not hazard-specific", None),
    ("Not stated", None),
]


class Interner:
    def __init__(self):
        self.items, self.index = [], {}

    def __call__(self, v):
        if v is None or (isinstance(v, float) and math.isnan(v)):
            return -1
        v = str(v).strip()
        if not v:
            return -1
        if v not in self.index:
            self.index[v] = len(self.items)
            self.items.append(v)
        return self.index[v]


def num(v):
    if v is None or pd.isna(v):
        return None
    v = float(v)
    return int(v) if v.is_integer() else round(v, 3)


def hazard_token_groups(mapping: pd.DataFrame) -> dict:
    """Token -> hazard group, from the Hazard_mapping sheet.

    Salinity appears twice there (coastal / inland, by AEZ rule); the token is
    listed under whichever group actually has rows, inland if neither does.
    """
    out, counts = {}, {}
    for _, r in mapping.iterrows():
        g, tok, n = r.iloc[0], r.iloc[1], r.iloc[2]
        if pd.isna(g) or pd.isna(tok):
            continue
        tok = re.sub(r"\s*\(.*where.*\)\s*$", "", str(tok)).strip()
        n = 0 if pd.isna(n) else n
        if tok not in out or n > counts[tok]:
            out[tok], counts[tok] = str(g).strip(), n
    return out


def main():
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SRC
    df = pd.read_excel(src, sheet_name="Classified_dataset")
    mapping = pd.read_excel(src, sheet_name="Hazard_mapping")
    tok_group = hazard_token_groups(mapping)

    I = {k: Interner() for k in
         "states districts aezNames aezGroups modules crops secondaries titles texts units".split()}
    parents = Interner()
    techs, tech_index = [], {}
    group_names = [g for g, _ in HAZARD_GROUPS]

    # Hazards ordered by group then by frequency, so the UI can list them grouped.
    tok_counts = {}
    for v in df["Hazard (atomic, as printed)"].dropna():
        for t in str(v).split(";"):
            t = t.strip()
            if t:
                tok_counts[t] = tok_counts.get(t, 0) + 1
    unknown = [t for t in tok_counts if t not in tok_group]
    if unknown:
        sys.exit(f"Hazard tokens missing from Hazard_mapping sheet: {unknown}")
    hazards = sorted(tok_counts, key=lambda t: (group_names.index(tok_group[t]), -tok_counts[t]))
    hz_index = {t: i for i, t in enumerate(hazards)}

    rows = []
    for _, r in df.iterrows():
        tech = str(r["Technology (harmonised)"]).strip()
        if tech not in tech_index:
            tech_index[tech] = len(techs)
            techs.append({"name": tech, "parent": parents(r["Parent group"])})

        mask = 0
        if pd.notna(r["Hazard (atomic, as printed)"]):
            for t in str(r["Hazard (atomic, as printed)"]).split(";"):
                if t.strip():
                    mask |= 1 << hz_index[t.strip()]

        flags = 0
        for bit, (g, col) in enumerate(HAZARD_GROUPS):
            if col and str(r[col]).strip().lower() == "yes":
                flags |= 1 << bit
        all_groups = str(r["Hazard group - all"])
        for bit, (g, col) in enumerate(HAZARD_GROUPS):
            if col is None and g in all_groups:
                flags |= 1 << bit

        rows.append([
            str(r["Database ID"]),
            I["states"](r["State or UT"]),
            I["districts"](r["District"]),
            I["aezNames"](r["AEZ name"]),
            I["aezGroups"](r["AEZ group"]),
            I["modules"](r["Module"]),
            I["crops"](r["Crop / animal"]),
            tech_index[tech],
            I["secondaries"](r["Secondary technology (bundled)"]),
            I["titles"](r["Technology"]),
            mask,
            flags,
            group_names.index(str(r["Hazard group - primary"]).strip()),
            I["texts"](r["Intervention (as printed)"]),
            I["texts"](r["Comparator (as printed or named)"]),
            num(r["Net return"]), num(r["Comparator net return"]), I["units"](r["Return unit"]),
            num(r["Cost of cultivation"]), num(r["Comparator cost of cultivation"]), I["units"](r["Cost unit"]),
            num(r["Yield"]), num(r["Comparator yield"]), I["units"](r["Yield unit"]),
            num(r["B:C ratio"]), num(r["Comparator B:C ratio"]),
            I["texts"](r["Classification note"]),
        ])

    payload = {
        "meta": {
            "source": src.name,
            "sheet": "Classified_dataset",
            "sourceModified": datetime.fromtimestamp(src.stat().st_mtime).date().isoformat(),
            "generated": date.today().isoformat(),
            "nRows": len(rows),
            "nColumnsInSource": int(df.shape[1]),
        },
        "dims": {
            **{k: v.items for k, v in I.items()},
            "parents": parents.items,
            "techs": techs,
            "hazardGroups": group_names,
            "hazards": [{"name": t, "group": group_names.index(tok_group[t])} for t in hazards],
        },
        "rows": rows,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")))
    print(f"{len(rows)} rows, {len(techs)} technologies, {len(parents.items)} parent groups, "
          f"{len(hazards)} hazards, {len(I['states'].items)} states -> {OUT} "
          f"({OUT.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
