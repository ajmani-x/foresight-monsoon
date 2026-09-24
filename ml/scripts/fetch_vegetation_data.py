"""
Fetch REAL historical NDVI (NASA MODIS MOD13Q1, via ORNL DAAC's no-auth point
subset API) and REAL daily rainfall (NASA POWER, via its no-auth point API)
for a representative subset of districts, to build a genuinely validated
rainfall -> vegetation-response model.

Unlike the main calibration ensemble's synthetic labels, both sides of this
dataset are real observations -- so its R^2 is a real, checkable number.
"""

import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date
from pathlib import Path

import requests

DATA = Path(__file__).resolve().parent.parent / "data"
DATA.mkdir(exist_ok=True)

# 10 representative districts spanning coastal / dry-belt / other climates
DISTRICTS = [
    ("MH-PUN", "Pune", 18.5204, 73.8567),
    ("KA-BLR", "Bengaluru Rural", 13.2846, 77.6947),
    ("TN-CHN", "Chennai", 13.0827, 80.2707),
    ("KL-EKM", "Ernakulam", 9.9816, 76.2999),
    ("GJ-AHM", "Ahmedabad", 23.0225, 72.5714),
    ("RJ-JAI", "Jaipur", 26.9124, 75.7873),
    ("MP-BPL", "Bhopal", 23.2599, 77.4126),
    ("UP-LKO", "Lucknow", 26.8467, 80.9462),
    ("WB-KOL", "Kolkata", 22.5726, 88.3639),
    ("AS-GUW", "Kamrup (Guwahati)", 26.1445, 91.7362),
]

NDVI_URL = "https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset"
POWER_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"

YEARS = list(range(2018, 2024))  # 6 years real history


def modis_windows(years):
    """~160-day windows (MODIS 'A<year><doy>' format), <=10 16-day tiles each."""
    windows = []
    for y in years:
        windows.append((f"A{y}001", f"A{y}160"))
        windows.append((f"A{y}161", f"A{y}320"))
        windows.append((f"A{y}321", f"A{y+1}045" if y + 1 in years or y == years[-1] else f"A{y}365"))
    return windows


def fetch_ndvi_window(district_id, lat, lon, start, end):
    try:
        r = requests.get(
            NDVI_URL,
            params={"latitude": lat, "longitude": lon, "startDate": start, "endDate": end, "kmAboveBelow": 0, "kmLeftRight": 0},
            timeout=60,
        )
        r.raise_for_status()
        return district_id, r.json()
    except Exception as e:
        print(f"  [ndvi FAILED] {district_id} {start}-{end}: {e}")
        return district_id, None


def fetch_rainfall(district_id, lat, lon):
    r = requests.get(
        POWER_URL,
        params={
            "parameters": "PRECTOTCORR",
            "community": "AG",
            "longitude": lon,
            "latitude": lat,
            "start": f"{YEARS[0]}0101",
            "end": f"{YEARS[-1]}1231",
            "format": "JSON",
        },
        timeout=60,
    )
    r.raise_for_status()
    return district_id, r.json()["properties"]["parameter"]["PRECTOTCORR"]


def main():
    print(f"Fetching rainfall for {len(DISTRICTS)} districts (fast, sequential)...")
    rainfall = {}
    for district_id, name, lat, lon in DISTRICTS:
        _, series = fetch_rainfall(district_id, lat, lon)
        rainfall[district_id] = series
        print(f"  [rain ok] {name}: {len(series)} days")

    windows = modis_windows(YEARS)
    print(f"\nFetching NDVI: {len(DISTRICTS)} districts x {len(windows)} windows = {len(DISTRICTS)*len(windows)} requests (parallel)...")

    ndvi_raw = {d[0]: [] for d in DISTRICTS}
    jobs = []
    with ThreadPoolExecutor(max_workers=12) as pool:
        for district_id, name, lat, lon in DISTRICTS:
            for start, end in windows:
                jobs.append(pool.submit(fetch_ndvi_window, district_id, lat, lon, start, end))

        done = 0
        for fut in as_completed(jobs):
            district_id, payload = fut.result()
            done += 1
            if payload:
                ndvi_raw[district_id].append(payload)
            if done % 10 == 0:
                print(f"  ... {done}/{len(jobs)} NDVI requests done")

    out = {
        "districts": {d[0]: {"name": d[1], "lat": d[2], "lon": d[3]} for d in DISTRICTS},
        "rainfall": rainfall,
        "ndvi_raw": ndvi_raw,
        "fetched_at": date.today().isoformat(),
    }
    out_path = DATA / "vegetation_raw.json"
    out_path.write_text(json.dumps(out))
    print(f"\nWrote {out_path} ({out_path.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
