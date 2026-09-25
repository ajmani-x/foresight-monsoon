"""
Build the training table from IMD's own subdivision rainfall dataset
(imd_subdivision_rainfall_1901_2015.csv) instead of NASA POWER -- this is
India's own official rainfall record (compiled by IITM/IMD, published
under India's National Data Sharing and Accessibility Policy), not a
global reanalysis approximation.

Trade-off vs. the NASA POWER version: this data is MONTHLY totals at the
36-subdivision level (not daily, not district-level), so day-level
dry-spell/heavy-day thresholds aren't possible. Instead, labels are each
subdivision-month's rainfall anomaly relative to its OWN long-run
climatological mean/std (1901-2015) -- still purely derived from real
observed rainfall, just at coarser granularity. Each of our 74 districts
inherits its subdivision's value (a documented approximation: several
districts share one subdivision-level rainfall series).
"""

import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "backend"))
from app.data.districts import DISTRICTS  # noqa: E402

DATA = Path(__file__).resolve().parent.parent / "data"
MONSOON_MONTHS = {6: "JUN", 7: "JUL", 8: "AUG", 9: "SEP"}

# District -> IMD meteorological subdivision (standard geographic mapping;
# a handful of borderline districts, e.g. Gwalior/Sagar/Malda, are assigned
# to the closest-fit subdivision -- documented approximation, not official
# IMD district-to-subdivision gazetting).
DISTRICT_TO_SUBDIVISION = {
    "MH-PUN": "MADHYA MAHARASHTRA", "MH-NAS": "MADHYA MAHARASHTRA",
    "MH-AUR": "MATATHWADA", "MH-NAG": "VIDARBHA", "MH-AMR": "VIDARBHA",
    "MH-KOL": "MADHYA MAHARASHTRA", "MH-SOL": "MADHYA MAHARASHTRA",
    "KA-BLR": "SOUTH INTERIOR KARNATAKA", "KA-MYS": "SOUTH INTERIOR KARNATAKA",
    "KA-BEL": "NORTH INTERIOR KARNATAKA", "KA-DHA": "NORTH INTERIOR KARNATAKA",
    "KA-RAI": "NORTH INTERIOR KARNATAKA", "KA-KAL": "NORTH INTERIOR KARNATAKA",
    "TN-CHN": "TAMIL NADU", "TN-CBE": "TAMIL NADU", "TN-MDU": "TAMIL NADU",
    "TN-TRZ": "TAMIL NADU", "TN-SLM": "TAMIL NADU",
    "AP-VSK": "COASTAL ANDHRA PRADESH", "AP-GTR": "COASTAL ANDHRA PRADESH",
    "AP-KRN": "RAYALSEEMA",
    "TG-HYD": "TELANGANA", "TG-WGL": "TELANGANA", "TG-NLG": "TELANGANA",
    "KL-EKM": "KERALA", "KL-PLK": "KERALA", "KL-WAY": "KERALA",
    "GJ-AHM": "GUJARAT REGION", "GJ-SUR": "GUJARAT REGION",
    "GJ-RAJ": "SAURASHTRA & KUTCH", "GJ-BNS": "GUJARAT REGION", "GJ-KUT": "SAURASHTRA & KUTCH",
    "RJ-JAI": "EAST RAJASTHAN", "RJ-JOD": "WEST RAJASTHAN",
    "RJ-KOT": "EAST RAJASTHAN", "RJ-UDA": "EAST RAJASTHAN", "RJ-GAN": "WEST RAJASTHAN",
    "MP-BPL": "WEST MADHYA PRADESH", "MP-IND": "WEST MADHYA PRADESH",
    "MP-JBP": "EAST MADHYA PRADESH", "MP-GWL": "WEST MADHYA PRADESH", "MP-SAG": "WEST MADHYA PRADESH",
    "UP-LKO": "EAST UTTAR PRADESH", "UP-KNP": "EAST UTTAR PRADESH",
    "UP-VNS": "EAST UTTAR PRADESH", "UP-AGR": "WEST UTTAR PRADESH",
    "UP-GKP": "EAST UTTAR PRADESH", "UP-MRT": "WEST UTTAR PRADESH",
    "BR-PAT": "BIHAR", "BR-GAY": "BIHAR", "BR-MUZ": "BIHAR", "BR-PUR": "BIHAR",
    "WB-KOL": "GANGETIC WEST BENGAL", "WB-HOO": "GANGETIC WEST BENGAL",
    "WB-BAR": "GANGETIC WEST BENGAL", "WB-MAL": "GANGETIC WEST BENGAL",
    "OR-BBS": "ORISSA", "OR-CTC": "ORISSA", "OR-KAL": "ORISSA",
    "JH-RAN": "JHARKHAND", "JH-DHN": "JHARKHAND",
    "CG-RAI": "CHHATTISGARH", "CG-BIL": "CHHATTISGARH", "CG-BST": "CHHATTISGARH",
    "PB-LUD": "PUNJAB", "PB-AMR": "PUNJAB", "PB-BAT": "PUNJAB",
    "HR-HIS": "HARYANA DELHI & CHANDIGARH", "HR-KAR": "HARYANA DELHI & CHANDIGARH",
    "HP-SML": "HIMACHAL PRADESH", "UK-DDN": "UTTARAKHAND",
    "AS-GUW": "ASSAM & MEGHALAYA", "AS-DIB": "ASSAM & MEGHALAYA", "AS-JOR": "ASSAM & MEGHALAYA",
}

COASTAL_STATES = {"Kerala", "Karnataka", "West Bengal", "Odisha", "Assam", "Tamil Nadu"}
DRY_BELT_STATES = {"Rajasthan", "Gujarat", "Maharashtra", "Telangana", "Madhya Pradesh"}


def sigmoid(x):
    return 1 / (1 + np.exp(-x))


def build():
    imd = pd.read_csv(DATA / "imd_subdivision_rainfall_1901_2015.csv")
    imd["SUBDIVISION"] = imd["SUBDIVISION"].str.strip()
    climate = pd.read_csv(DATA / "climate_indices_monthly.csv")

    # climatological mean/std per subdivision per monsoon month, from the full real record
    clim_stats = {}
    for subdiv, g in imd.groupby("SUBDIVISION"):
        for month_num, col in MONSOON_MONTHS.items():
            vals = g[col].dropna()
            vals = vals[vals >= 0]
            if len(vals) > 10:
                clim_stats[(subdiv, month_num)] = (vals.mean(), vals.std())

    rows = []
    missing_subdiv = set()
    for d in DISTRICTS:
        district_id, name, state, lat, lon, crop = d
        subdiv = DISTRICT_TO_SUBDIVISION.get(district_id)
        if subdiv is None:
            missing_subdiv.add(district_id)
            continue
        coastal = 1 if state in COASTAL_STATES else 0
        dry_belt = 1 if state in DRY_BELT_STATES else 0

        sub_rows = imd[imd.SUBDIVISION == subdiv]
        for _, r in sub_rows.iterrows():
            year = int(r["YEAR"])
            for month_num, col in MONSOON_MONTHS.items():
                val = r[col]
                stats = clim_stats.get((subdiv, month_num))
                if pd.isna(val) or val < 0 or stats is None or stats[1] == 0:
                    continue
                mean, std = stats
                z = (val - mean) / std

                rows.append(
                    {
                        "year": year,
                        "month": month_num,
                        "district_id": district_id,
                        "subdivision": subdiv,
                        "lat": lat,
                        "lon": lon,
                        "coastal": coastal,
                        "dry_belt": dry_belt,
                        "rainfall_mm": val,
                        "rainfall_zscore": z,
                        "onset_target": float(np.clip(sigmoid(z * 0.9), 0.02, 0.97)),
                        "break_target": float(np.clip(sigmoid(-z * 1.1), 0.02, 0.97)),
                        "heavy_target": float(np.clip(sigmoid((z - 1.5) * 1.3), 0.01, 0.9)),
                    }
                )

    if missing_subdiv:
        print(f"WARNING: no subdivision mapping for {missing_subdiv}")

    df = pd.DataFrame(rows)
    df = df.merge(climate, on=["year", "month"], how="inner")

    out = DATA / "imd_training_table.csv"
    df.to_csv(out, index=False)
    print(f"Wrote {len(df)} rows ({df.year.min()}-{df.year.max()}, {df.district_id.nunique()} districts) to {out}")
    print("\nLabel distribution:")
    print(df[["onset_target", "break_target", "heavy_target"]].describe())
    return df


if __name__ == "__main__":
    build()
