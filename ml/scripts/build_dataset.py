"""
Build a per-district, per-monsoon-month training table.

Labels are constructed from published, well-established ENSO/IOD-monsoon
relationships (El Nino years tend toward deficient/break-prone Indian
monsoon; La Nina years toward normal-to-above-normal monsoon; a positive
IOD is known to partially offset an El Nino's suppressing effect) applied
per district using real historical ONI/DMI/MJO values, combined with each
district's known coastal/dry-belt characteristics.

This is a physically-grounded label generator standing in for true IMD
gridded rainfall observations, which require a manual form-submission
download at imdpune.gov.in/cmpg/Griddata/Rainfall_25_NetCDF.html (no
scriptable bulk endpoint). Swap `label_targets()` for real observed
onset/break/heavy-rain rates per district-month once that data is in hand
— nothing downstream (features, model, inference contract) needs to change.
"""

import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "backend"))
from app.data.districts import DISTRICTS  # noqa: E402

DATA = Path(__file__).resolve().parent.parent / "data"

COASTAL_STATES = {"Kerala", "Karnataka", "West Bengal", "Odisha", "Assam", "Tamil Nadu"}
DRY_BELT_STATES = {"Rajasthan", "Gujarat", "Maharashtra", "Telangana", "Madhya Pradesh"}

MONSOON_MONTHS = [6, 7, 8, 9]  # JJAS - the Indian summer monsoon season


def district_traits(state: str):
    coastal = 1 if state in COASTAL_STATES else 0
    dry_belt = 1 if state in DRY_BELT_STATES else 0
    return coastal, dry_belt


def label_targets(oni, dmi, mjo_amplitude, mjo_phase, coastal, dry_belt, rng):
    """Physically-grounded probability targets in [0,1] from real indices."""
    el_nino_strength = max(0.0, oni)  # positive ONI = El Nino
    la_nina_strength = max(0.0, -oni)  # negative ONI = La Nina
    iod_offset = max(0.0, dmi) * 0.5  # positive IOD offsets El Nino's suppression

    mjo_active_india = 1.0 if mjo_phase in (2, 3, 4) else 0.3  # phases 2-4: convection over Indian Ocean
    mjo_strength = min(mjo_amplitude / 2.5, 1.0)

    break_base = 0.35 + el_nino_strength * 0.22 - iod_offset * 0.15 + dry_belt * 0.12 - coastal * 0.08
    break_base -= mjo_active_india * mjo_strength * 0.1
    break_prob = np.clip(break_base + rng.normal(0, 0.08), 0.03, 0.95)

    onset_base = 0.4 + la_nina_strength * 0.2 + coastal * 0.1 - dry_belt * 0.08
    onset_base += mjo_active_india * mjo_strength * 0.15
    onset_prob = np.clip(onset_base + rng.normal(0, 0.08), 0.03, 0.95)

    heavy_base = 0.25 + la_nina_strength * 0.18 + max(0, dmi) * 0.15 + coastal * 0.12
    heavy_base += mjo_active_india * mjo_strength * 0.12
    heavy_prob = np.clip(heavy_base + rng.normal(0, 0.07), 0.02, 0.9)

    return onset_prob, break_prob, heavy_prob


def build():
    idx = pd.read_csv(DATA / "climate_indices_monthly.csv")
    idx = idx[idx["month"].isin(MONSOON_MONTHS)].reset_index(drop=True)

    rng = np.random.default_rng(42)
    rows = []
    for _, r in idx.iterrows():
        for d in DISTRICTS:
            district_id, name, state, lat, lon, crop = d
            coastal, dry_belt = district_traits(state)
            onset, brk, heavy = label_targets(
                r.oni, r.dmi, r.mjo_amplitude, r.mjo_phase, coastal, dry_belt, rng
            )
            rows.append(
                {
                    "year": int(r.year),
                    "month": int(r.month),
                    "district_id": district_id,
                    "lat": lat,
                    "lon": lon,
                    "coastal": coastal,
                    "dry_belt": dry_belt,
                    "oni": r.oni,
                    "dmi": r.dmi,
                    "mjo_amplitude": r.mjo_amplitude,
                    "mjo_phase": r.mjo_phase,
                    "onset_target": onset,
                    "break_target": brk,
                    "heavy_target": heavy,
                }
            )

    df = pd.DataFrame(rows)
    out = DATA / "training_table.csv"
    df.to_csv(out, index=False)
    print(f"Wrote {len(df)} rows ({idx.year.min()}-{idx.year.max()}, {len(DISTRICTS)} districts) to {out}")
    return df


if __name__ == "__main__":
    build()
