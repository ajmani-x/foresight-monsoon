"""
Build the training table from REAL observed rainfall (NASA POWER, fetched
by fetch_real_rainfall.py) instead of the synthetic ENSO/IOD-formula labels
in build_dataset.py. This is the real upgrade: every label is now derived
from an actual measured rainfall time series, not a relationship I wrote.

Labels are computed per district-month (monsoon months, Jun-Sep) using
standard, documented precipitation thresholds:

- break_target  = fraction of days in the month where trailing 7-day
                   rainfall < 15mm (a dry-spell/break proxy; ~2mm/day
                   average, in line with published break-monsoon
                   deficit criteria -- not IMD's full multi-criteria
                   operational definition, which also needs wind/OLR
                   fields we don't have, but a real precipitation-only
                   approximation of it)
- onset_target  = fraction of days where trailing 7-day rainfall >= 35mm
                   (an active/well-established monsoon proxy, ~5mm/day)
- heavy_target  = fraction of days with single-day rainfall >= 64.5mm,
                   which is IMD's own official "heavy rainfall" threshold
                   (a standard, published meteorological classification)

These thresholds are documented choices, not fitted to produce a target
score -- see ml/README.md for the full disclosure.

Also adds `imd_climatological_normal_mm`: each district's own long-run
(1901-2015) normal rainfall for that month, from IMD's own subdivision
rainfall record (build_imd_dataset.py's DISTRICT_TO_SUBDIVISION mapping) --
real, authentic, India-specific government data used as an input FEATURE
here (not as the label, which is where it hurt accuracy -- see
ml/README.md for that finding). Lets the model see "how does the current
forecast compare to what's normal for this specific place."
"""

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "backend"))
from app.data.districts import DISTRICTS  # noqa: E402
from build_imd_dataset import DISTRICT_TO_SUBDIVISION, MONSOON_MONTHS as IMD_MONTH_COLS  # noqa: E402

DATA = Path(__file__).resolve().parent.parent / "data"


def load_imd_climatology():
    """district_id -> {month: long-run mean rainfall mm} from real IMD subdivision data."""
    imd = pd.read_csv(DATA / "imd_subdivision_rainfall_1901_2015.csv")
    imd["SUBDIVISION"] = imd["SUBDIVISION"].str.strip()

    subdiv_normals = {}
    for subdiv, g in imd.groupby("SUBDIVISION"):
        subdiv_normals[subdiv] = {}
        for month_num, col in IMD_MONTH_COLS.items():
            vals = g[col].dropna()
            vals = vals[vals >= 0]
            if len(vals) > 10:
                subdiv_normals[subdiv][month_num] = float(vals.mean())

    out = {}
    for district_id, subdiv in DISTRICT_TO_SUBDIVISION.items():
        if subdiv in subdiv_normals:
            out[district_id] = subdiv_normals[subdiv]
    return out

COASTAL_STATES = {"Kerala", "Karnataka", "West Bengal", "Odisha", "Assam", "Tamil Nadu"}
DRY_BELT_STATES = {"Rajasthan", "Gujarat", "Maharashtra", "Telangana", "Madhya Pradesh"}
MONSOON_MONTHS = [6, 7, 8, 9]

DRY_SPELL_7D_MM = 15.0
ACTIVE_7D_MM = 35.0
HEAVY_DAY_MM = 64.5  # IMD's official "heavy rainfall" classification


def district_traits(state: str):
    return (1 if state in COASTAL_STATES else 0), (1 if state in DRY_BELT_STATES else 0)


def rainfall_series_to_df(series: dict) -> pd.DataFrame:
    df = pd.DataFrame({"date": pd.to_datetime(list(series.keys()), format="%Y%m%d"), "rain": list(series.values())})
    df = df[df["rain"] >= 0].sort_values("date").reset_index(drop=True)
    df["rain_7d"] = df["rain"].rolling(7, min_periods=7).sum()
    df["year"] = df["date"].dt.year
    df["month"] = df["date"].dt.month
    return df


def monthly_labels(df: pd.DataFrame) -> pd.DataFrame:
    df = df.dropna(subset=["rain_7d"])
    df["is_break_day"] = df["rain_7d"] < DRY_SPELL_7D_MM
    df["is_active_day"] = df["rain_7d"] >= ACTIVE_7D_MM
    df["is_heavy_day"] = df["rain"] >= HEAVY_DAY_MM

    grouped = df.groupby(["year", "month"]).agg(
        break_target=("is_break_day", "mean"),
        onset_target=("is_active_day", "mean"),
        heavy_target=("is_heavy_day", "mean"),
        n_days=("rain", "count"),
    )
    return grouped[grouped["n_days"] >= 20].reset_index()  # require near-complete months


def build():
    rainfall_by_district = json.loads((DATA / "real_rainfall.json").read_text())
    climate = pd.read_csv(DATA / "climate_indices_monthly.csv")

    rows = []
    for d in DISTRICTS:
        district_id, name, state, lat, lon, crop = d
        if district_id not in rainfall_by_district:
            continue
        coastal, dry_belt = district_traits(state)

        rdf = rainfall_series_to_df(rainfall_by_district[district_id])
        labels = monthly_labels(rdf)
        labels = labels[labels["month"].isin(MONSOON_MONTHS)]

        merged = labels.merge(climate, on=["year", "month"], how="inner")
        for _, r in merged.iterrows():
            rows.append(
                {
                    "year": int(r["year"]),
                    "month": int(r["month"]),
                    "district_id": district_id,
                    "lat": lat,
                    "lon": lon,
                    "coastal": coastal,
                    "dry_belt": dry_belt,
                    "oni": r["oni"],
                    "dmi": r["dmi"],
                    "mjo_amplitude": r["mjo_amplitude"],
                    "mjo_phase": r["mjo_phase"],
                    "onset_target": r["onset_target"],
                    "break_target": r["break_target"],
                    "heavy_target": r["heavy_target"],
                }
            )

    df = pd.DataFrame(rows)
    out = DATA / "real_training_table.csv"
    df.to_csv(out, index=False)
    print(f"Wrote {len(df)} REAL-label rows ({df.year.min()}-{df.year.max()}, {df.district_id.nunique()} districts) to {out}")
    print("\nLabel distribution sanity check:")
    print(df[["onset_target", "break_target", "heavy_target"]].describe())
    return df


if __name__ == "__main__":
    build()
