"""
Fetch REAL daily rainfall for all 74 districts from NASA POWER (no-auth,
confirmed reliable and fast -- unlike IMD's manual-download-only portal).
This replaces the synthetic label generator in build_dataset.py: instead of
labels derived from an ENSO/IOD formula, labels will now be derived from
real observed rainfall.
"""

import json
import sys
import time
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "backend"))
from app.data.districts import DISTRICTS  # noqa: E402

DATA = Path(__file__).resolve().parent.parent / "data"
DATA.mkdir(exist_ok=True)

POWER_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
START = "19810101"
END = "20231231"


def fetch_one(district_id, lat, lon):
    r = requests.get(
        POWER_URL,
        params={
            "parameters": "PRECTOTCORR",
            "community": "AG",
            "longitude": lon,
            "latitude": lat,
            "start": START,
            "end": END,
            "format": "JSON",
        },
        timeout=60,
    )
    r.raise_for_status()
    return r.json()["properties"]["parameter"]["PRECTOTCORR"]


def main():
    out = {}
    for i, d in enumerate(DISTRICTS):
        district_id, name, state, lat, lon, crop = d
        for attempt in range(3):
            try:
                series = fetch_one(district_id, lat, lon)
                out[district_id] = series
                print(f"[{i+1}/{len(DISTRICTS)}] {name}: {len(series)} days")
                break
            except Exception as e:
                print(f"  retry {attempt+1} for {name}: {e}")
                time.sleep(2)
        else:
            print(f"  [FAILED] {name} after 3 attempts")

    out_path = DATA / "real_rainfall.json"
    out_path.write_text(json.dumps(out))
    print(f"\nWrote {out_path} ({out_path.stat().st_size / 1e6:.1f} MB), {len(out)}/{len(DISTRICTS)} districts")


if __name__ == "__main__":
    main()
