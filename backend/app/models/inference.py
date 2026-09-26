"""
Real model inference: loads the trained calibration ensemble (one XGBoost
regressor per target, trained in ml/scripts/train.py on real ENSO/IOD/MJO
indices + district geography — see ml/README.md) and predicts onset /
break / heavy-rain probabilities per district.

Current climate index snapshot is fetched LIVE from NOAA CPC / NOAA PSL /
BoM (see live_climate.py) whenever it's stale (>6h old), cached in-process
between fetches since these indices don't change faster than daily.
climate_indices_monthly.csv (the static training-time snapshot) is only a
fallback for the rare case a live fetch fails and there's no cached value
yet — so a slow/unreachable external source degrades gracefully instead of
breaking predictions.
"""

from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from app.models.live_climate import get_cached_or_live_indices

MODELS_DIR = Path(__file__).resolve().parent
BUNDLE_PATH = MODELS_DIR / "calibration_ensemble.joblib"
INDICES_PATH = MODELS_DIR / "climate_indices_monthly.csv"


@lru_cache(maxsize=1)
def _load_bundle():
    return joblib.load(BUNDLE_PATH)


@lru_cache(maxsize=1)
def _static_fallback_indices():
    """Last-resort snapshot if a live fetch fails before any live value has
    ever been cached. Not used once a live fetch has succeeded at least once."""
    df = pd.read_csv(INDICES_PATH)
    latest = df.dropna(subset=["oni", "dmi"]).iloc[-1]
    amplitude = df["mjo_amplitude"].replace(0, np.nan).dropna()
    return {
        "oni": float(latest["oni"]),
        "dmi": float(latest["dmi"]),
        "mjo_amplitude": float(amplitude.mean()) if len(amplitude) else 1.2,
        "mjo_phase": 0.0,
        "as_of_year": int(latest["year"]),
        "as_of_month": int(latest["month"]),
        "live": False,
    }


def _current_indices():
    return get_cached_or_live_indices(fallback=_static_fallback_indices())


def current_climate_state() -> dict:
    return dict(_current_indices())


@lru_cache(maxsize=512)
def predict_district(district_id: str, lat: float, lon: float, coastal: int, dry_belt: int, month: int | None = None):
    """Returns (onset_probability, break_probability, heavy_rain_probability).

    Cached: the current climate snapshot only changes once a day (see
    _current_indices), so repeated calls for the same district+month within
    a process lifetime are pure recomputation otherwise — and with a 4-model
    ensemble per target, that recomputation is expensive enough (~3s across
    all 74 districts) to matter for endpoints that loop over every district
    per request (districts/map, advisory, districts/summary).
    """
    bundle = _load_bundle()
    idx = _current_indices()
    m = month or idx["as_of_month"]

    row = pd.DataFrame(
        [
            {
                "lat": lat,
                "lon": lon,
                "coastal": coastal,
                "dry_belt": dry_belt,
                "oni": idx["oni"],
                "dmi": idx["dmi"],
                "mjo_amplitude": idx["mjo_amplitude"],
                "mjo_phase": idx["mjo_phase"],
                "month": m,
            }
        ]
    )
    row = row[bundle["features"]]

    onset = float(np.clip(bundle["models"]["onset"].predict(row)[0], 0.02, 0.97))
    brk = float(np.clip(bundle["models"]["break"].predict(row)[0], 0.02, 0.97))
    heavy = float(np.clip(bundle["models"]["heavy"].predict(row)[0], 0.01, 0.9))
    return onset, brk, heavy


def predict_batch(rows: list[dict]) -> list[tuple[float, float, float]]:
    """Same model, same features as predict_district, but for many
    districts at once in 3 vectorized .predict() calls (one per target)
    instead of one Python-level call per district per target.

    This exists because looping predict_district() over all 423 districts
    (the national map/summary endpoints) took 30s+ even on a fast machine,
    and far longer on Render's throttled free-tier CPU -- per-call overhead
    on a 1-row DataFrame dominates at this scale; batching amortizes it
    away almost entirely (verified: same 423 districts in well under a
    second). Each row must already contain every key in
    calibration_ensemble's `features` list (lat, lon, coastal, dry_belt,
    oni, dmi, mjo_amplitude, mjo_phase, month).
    """
    bundle = _load_bundle()
    df = pd.DataFrame(rows)[bundle["features"]]

    onset = np.clip(bundle["models"]["onset"].predict(df), 0.02, 0.97)
    brk = np.clip(bundle["models"]["break"].predict(df), 0.02, 0.97)
    heavy = np.clip(bundle["models"]["heavy"].predict(df), 0.01, 0.9)

    return list(zip(
        (float(v) for v in onset),
        (float(v) for v in brk),
        (float(v) for v in heavy),
    ))
