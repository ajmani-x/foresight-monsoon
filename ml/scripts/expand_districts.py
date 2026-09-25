"""
One-time script: expands backend/app/data/districts.py from the original
curated 74 demo districts to ~400+ districts covering most of India, using
a public Indian cities/districts geodata source (district, state,
lat/lon) deduplicated to the highest-population city per district as a
centroid proxy.

Why this matters: the trained ensemble takes lat/lon as continuous
features, not a memorized list -- it was never limited to only the 74
demo districts, only backend/app/data/districts.py's REGISTRY was. A
farmer messaging in via WhatsApp from a district outside the original 74
would hit a 404 with the old list; this expansion is the real fix.

The original 74 keep their hand-curated primary_crop (used by the rule-
based advisory engine as a fallback when a farmer hasn't stated their own
crop). New districts get a reasonable state-level default crop -- a farmer
profile's own `crops` field should be preferred over this in practice
(see llm_advisory.py), so this default only matters as a last resort.
"""

import csv
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent.parent / "backend"
sys.path.insert(0, str(BACKEND))
from app.data.districts import DISTRICTS as EXISTING  # noqa: E402

RAW_CSV = Path(__file__).resolve().parent.parent / "data" / "india_cities_geodata.csv"

COASTAL_STATES = {
    "Kerala", "Karnataka", "West Bengal", "Odisha", "Assam", "Tamil Nadu",
    "Goa", "Andhra Pradesh", "Gujarat", "Maharashtra", "Puducherry",
    "Andaman and Nicobar Islands", "Lakshadweep", "Daman and Diu",
}
DRY_BELT_STATES = {"Rajasthan", "Gujarat", "Maharashtra", "Telangana", "Madhya Pradesh"}

# reasonable, disclosed default crop per state -- only used as a
# last-resort fallback when a farmer hasn't specified their own crop
STATE_DEFAULT_CROP = {
    "Andaman and Nicobar Islands": "Coconut", "Andhra Pradesh": "Rice",
    "Arunachal Pradesh": "Rice", "Assam": "Tea", "Bihar": "Rice",
    "Chandigarh": "Wheat", "Chhattisgarh": "Rice",
    "Dadra and Nagar Haveli and Daman and Diu": "Rice", "Delhi": "Wheat",
    "Goa": "Rice", "Gujarat": "Cotton", "Haryana": "Wheat",
    "Himachal Pradesh": "Maize", "Jammu and Kashmir": "Rice",
    "Jharkhand": "Rice", "Karnataka": "Ragi", "Kerala": "Coconut",
    "Lakshadweep": "Coconut", "Madhya Pradesh": "Soybean",
    "Maharashtra": "Cotton", "Manipur": "Rice", "Meghalaya": "Maize",
    "Mizoram": "Rice", "Nagaland": "Rice", "Odisha": "Rice",
    "Puducherry": "Rice", "Punjab": "Wheat", "Rajasthan": "Bajra",
    "Sikkim": "Maize", "Tamil Nadu": "Paddy", "Telangana": "Cotton",
    "Tripura": "Rice", "Uttar Pradesh": "Wheat", "Uttarakhand": "Wheat",
    "West Bengal": "Rice",
}

STATE_ABBREV = {
    "Andaman and Nicobar Islands": "AN", "Andhra Pradesh": "AP", "Arunachal Pradesh": "AR",
    "Assam": "AS", "Bihar": "BR", "Chandigarh": "CH", "Chhattisgarh": "CG",
    "Dadra and Nagar Haveli and Daman and Diu": "DN", "Delhi": "DL", "Goa": "GA",
    "Gujarat": "GJ", "Haryana": "HR", "Himachal Pradesh": "HP", "Jammu and Kashmir": "JK",
    "Jharkhand": "JH", "Karnataka": "KA", "Kerala": "KL", "Lakshadweep": "LD",
    "Madhya Pradesh": "MP", "Maharashtra": "MH", "Manipur": "MN", "Meghalaya": "ML",
    "Mizoram": "MZ", "Nagaland": "NL", "Odisha": "OR", "Puducherry": "PY",
    "Punjab": "PB", "Rajasthan": "RJ", "Sikkim": "SK", "Tamil Nadu": "TN",
    "Telangana": "TG", "Tripura": "TR", "Uttar Pradesh": "UP", "Uttarakhand": "UK",
    "West Bengal": "WB",
}


def main():
    with open(RAW_CSV) as f:
        rows = list(csv.DictReader(f))

    by_district = {}
    for r in rows:
        key = (r["district"].strip(), r["state"].strip())
        pop = int(r["population"]) if r["population"].isdigit() else 0
        if key not in by_district or pop > by_district[key][0]:
            by_district[key] = (pop, r)

    existing_keys = {(d[1], d[2]) for d in EXISTING}
    used_ids = {d[0] for d in EXISTING}

    new_entries = []
    for (district, state), (pop, r) in by_district.items():
        if (district, state) in existing_keys:
            continue  # keep the original curated entry as-is
        abbrev = STATE_ABBREV.get(state, state[:2].upper())
        base_id = f"{abbrev}-{district[:3].upper().replace(' ', '')}"
        district_id = base_id
        n = 1
        while district_id in used_ids:
            n += 1
            district_id = f"{base_id}{n}"
        used_ids.add(district_id)

        crop = STATE_DEFAULT_CROP.get(state, "Mixed crops")
        new_entries.append(
            (district_id, district, state, float(r["latitude"]), float(r["longitude"]), crop)
        )

    all_entries = list(EXISTING) + sorted(new_entries, key=lambda e: (e[2], e[1]))

    out = BACKEND / "app" / "data" / "districts.py"
    with open(out, "w") as f:
        f.write('"""\n')
        f.write("Indian districts with centroid coordinates.\n\n")
        f.write("Each entry: id, name, state, lat, lon, primary_crop.\n\n")
        f.write(f"The original {len(EXISTING)} entries (curated for the demo) have\n")
        f.write("hand-picked primary crops; the remaining entries were added via\n")
        f.write("ml/scripts/expand_districts.py from a public India cities/districts\n")
        f.write("geodata source, so farmers from more districts (e.g. via the WhatsApp\n")
        f.write("intake flow, not just the demo map) can get real predictions --\n")
        f.write("their primary_crop is a state-level default, since the model and\n")
        f.write("advisory engine both prefer a farmer's own stated crop when available.\n")
        f.write('"""\n\n')
        f.write("DISTRICTS = [\n")
        f.write("    # (id, name, state, lat, lon, primary_crop)\n")
        for e in all_entries:
            f.write(f'    ("{e[0]}", "{e[1]}", "{e[2]}", {e[3]}, {e[4]}, "{e[5]}"),\n')
        f.write("]\n")

    print(f"Wrote {len(all_entries)} districts ({len(EXISTING)} original + {len(new_entries)} new) to {out}")


if __name__ == "__main__":
    main()
