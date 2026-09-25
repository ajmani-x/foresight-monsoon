"""
Build the training table from the REAL IMD official gridded rainfall data
(downloaded locally via imdlib -- see download_imd_grid_LOCAL.py -- since
IMD's server blocks cloud/datacenter IPs). This is the most authentic
version: real daily rainfall, sourced directly from India's own
meteorological department, at each district's actual grid location.

Same label logic as build_real_dataset.py (which used NASA POWER):
- break_target  = fraction of days in the month where trailing 7-day
                   rainfall < 15mm (dry-spell/break proxy)
- onset_target  = fraction of days where trailing 7-day rainfall >= 35mm
                   (active/well-established monsoon proxy)
- heavy_target  = fraction of days with single-day rainfall >= 64.5mm
                   (IMD's own official "heavy rainfall" threshold)

Note: coverage is 10 real years (1992, 1993, 1996, 1998, 2004, 2007, 2009,
2011, 2014, 2022) rather than a continuous run -- IMD's server was flaky
even from a residential connection, failing intermittently rather than
blocking outright. Re-running download_imd_grid_LOCAL.py will pick up more
years over time; this script works with whatever's in the CSV.
"""

import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "backend"))
from app.data.districts import DISTRICTS  # noqa: E402

DATA = Path(__file__).resolve().parent.parent / "data"
SCRIPTS = Path(__file__).resolve().parent

COASTAL_STATES = {"Kerala", "Karnataka", "West Bengal", "Odisha", "Assam", "Tamil Nadu"}
DRY_BELT_STATES = {"Rajasthan", "Gujarat", "Maharashtra", "Telangana", "Madhya Pradesh"}
MONSOON_MONTHS = [6, 7, 8, 9]

DRY_SPELL_7D_MM = 15.0
ACTIVE_7D_MM = 35.0
HEAVY_DAY_MM = 64.5  # IMD's official "heavy rainfall" classification


def district_traits(state: str):
    return (1 if state in COASTAL_STATES else 0), (1 if state in DRY_BELT_STATES else 0)


def monthly_labels(df: pd.DataFrame) -> pd.DataFrame:
    df = df.sort_values("date").copy()
    df["rain_7d"] = df["rainfall_mm"].rolling(7, min_periods=7).sum()
    df = df.dropna(subset=["rain_7d"])
    df["year"] = df["date"].dt.year
    df["month"] = df["date"].dt.month

    df["is_break_day"] = df["rain_7d"] < DRY_SPELL_7D_MM
    df["is_active_day"] = df["rain_7d"] >= ACTIVE_7D_MM
    df["is_heavy_day"] = df["rainfall_mm"] >= HEAVY_DAY_MM

    grouped = df.groupby(["year", "month"]).agg(
        break_target=("is_break_day", "mean"),
        onset_target=("is_active_day", "mean"),
        heavy_target=("is_heavy_day", "mean"),
        n_days=("rainfall_mm", "count"),
    )
    return grouped[grouped["n_days"] >= 20].reset_index()


def build():
    rainfall = pd.read_csv(SCRIPTS / "imd_district_rainfall.csv")
    rainfall["date"] = pd.to_datetime(rainfall["date"])
    climate = pd.read_csv(DATA / "climate_indices_monthly.csv")

    rows = []
    for d in DISTRICTS:
        district_id, name, state, lat, lon, crop = d
        district_rain = rainfall[rainfall.district_id == district_id]
        if district_rain.empty:
            continue
        coastal, dry_belt = district_traits(state)

        labels = monthly_labels(district_rain)
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
    out = DATA / "imd_grid_training_table.csv"
    df.to_csv(out, index=False)
    print(f"Wrote {len(df)} rows ({df.district_id.nunique()} districts, years: {sorted(df.year.unique())}) to {out}")
    print("\nLabel distribution:")
    print(df[["onset_target", "break_target", "heavy_target"]].describe())
    return df


if __name__ == "__main__":
    build()
