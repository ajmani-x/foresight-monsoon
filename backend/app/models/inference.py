"""
Real model inference: loads the trained calibration ensemble (one XGBoost
regressor per target, trained in ml/scripts/train.py on real ENSO/IOD/MJO
indices + district geography — see ml/README.md) and predicts onset /
break / heavy-rain probabilities per district.

Current climate index snapshot is loaded from climate_indices_monthly.csv
(the most recent row) rather than fetched live, since NOAA/BoM endpoints
aren't wired into this service. MJO real-time feed was not reliably
scriptable at training time (BoM blocks automated access; the historical
mirror used for training has a reporting lag), so a climatological
average amplitude/neutral phase is used for the current snapshot until a
live MJO feed is wired in.
"""

from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

MODELS_DIR = Path(__file__).resolve().parent
BUNDLE_PATH = MODELS_DIR / "calibration_ensemble.joblib"
INDICES_PATH = MODELS_DIR / "climate_indices_monthly.csv"


@lru_cache(maxsize=1)
def _load_bundle():
    return joblib.load(BUNDLE_PATH)


@lru_cache(maxsize=1)
def _current_indices():
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
    }


def current_climate_state() -> dict:
    return dict(_current_indices())


def predict_district(district_id: str, lat: float, lon: float, coastal: int, dry_belt: int, month: int | None = None):
    """Returns (onset_probability, break_probability, heavy_rain_probability)."""
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
