"""
Turn the raw NDVI + rainfall fetch (fetch_vegetation_data.py) into a tidy
per-district-date table: real NDVI value + real antecedent rainfall
features (cumulative rainfall in the preceding 15/30 days), for training a
genuinely validated rainfall -> vegetation-response regression.

NDVI is scaled by 1e-4 per the MOD13Q1 product spec. Only pixel_reliability
0 (good) or 1 (marginal) observations are kept -- 2/3 mean snow/ice or
cloud-covered, unusable.
"""

import json
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd

DATA = Path(__file__).resolve().parent.parent / "data"


def extract_ndvi_series(ndvi_raw_windows):
    """One row per (calendar_date, ndvi, reliability) from the raw MODIS subset payloads."""
    ndvi_by_date = {}
    reliability_by_date = {}
    for window in ndvi_raw_windows:
        for item in window.get("subset", []):
            date = item["calendar_date"]
            if item["band"] == "250m_16_days_NDVI":
                val = item["data"][0]
                if val is not None and -2000 <= val <= 10000:  # sanity range pre-scaling
                    ndvi_by_date[date] = val * 1e-4
            elif item["band"] == "250m_16_days_pixel_reliability":
                reliability_by_date[date] = item["data"][0]

    rows = []
    for date, ndvi in ndvi_by_date.items():
        rel = reliability_by_date.get(date)
        if rel is not None and rel in (0, 1):
            rows.append({"date": date, "ndvi": ndvi})
    return pd.DataFrame(rows).sort_values("date").drop_duplicates("date")


def rainfall_features(rainfall_dict, target_date_str, lookback_days):
    target = datetime.strptime(target_date_str, "%Y-%m-%d")
    total = 0.0
    count = 0
    for d in range(1, lookback_days + 1):
        day = (target - timedelta(days=d)).strftime("%Y%m%d")
        val = rainfall_dict.get(day)
        if val is not None and val >= 0:
            total += val
            count += 1
    return total if count > 0 else None


def build():
    raw = json.loads((DATA / "vegetation_raw.json").read_text())

    rows = []
    for district_id, meta in raw["districts"].items():
        ndvi_df = extract_ndvi_series(raw["ndvi_raw"][district_id])
        rainfall = raw["rainfall"][district_id]

        for _, r in ndvi_df.iterrows():
            rain_15d = rainfall_features(rainfall, r["date"], 15)
            rain_30d = rainfall_features(rainfall, r["date"], 30)
            if rain_15d is None or rain_30d is None:
                continue
            rows.append(
                {
                    "district_id": district_id,
                    "date": r["date"],
                    "lat": meta["lat"],
                    "lon": meta["lon"],
                    "month": int(r["date"][5:7]),
                    "rain_15d": rain_15d,
                    "rain_30d": rain_30d,
                    "ndvi": r["ndvi"],
                }
            )

    df = pd.DataFrame(rows)
    out = DATA / "vegetation_table.csv"
    df.to_csv(out, index=False)
    print(f"Wrote {len(df)} real (rainfall -> NDVI) rows to {out}")
    print(df.groupby("district_id").size())
    return df


if __name__ == "__main__":
    build()
