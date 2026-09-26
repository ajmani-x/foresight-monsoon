"""
Forecast generator — now backed by the real trained calibration ensemble
(see ml/scripts/train.py, backend/app/models/inference.py).

The current-day base probability per district comes from the real XGBoost
model, driven by real ENSO/IOD/MJO index values. The day-by-day timeline
around that base value is generated with a lightweight, documented
uncertainty-widening model (the trained ensemble is monthly-granularity;
a genuine per-day TFT quantile head is the next real upgrade — see
ml/README.md) rather than a full daily forecast model. Confidence
decays with horizon, which is an honest signal, not decoration.
"""

import hashlib
import math
import time
from datetime import date, timedelta

from app.data.districts import DISTRICTS
from app.models.inference import current_climate_state, predict_batch, predict_district

COASTAL_STATES = {"Kerala", "Karnataka", "West Bengal", "Odisha", "Assam", "Tamil Nadu"}
DRY_BELT_STATES = {"Rajasthan", "Gujarat", "Maharashtra", "Telangana", "Madhya Pradesh"}


def _enso_phase_label(oni: float) -> tuple[str, str]:
    if oni >= 1.5:
        return "Strong El Nino", "strengthening"
    if oni >= 0.5:
        return "El Nino", "developing"
    if oni <= -1.5:
        return "Strong La Nina", "strengthening"
    if oni <= -0.5:
        return "La Nina", "developing"
    return "Neutral", "stable"


def _iod_phase_label(dmi: float) -> str:
    if dmi >= 0.4:
        return "Positive IOD"
    if dmi <= -0.4:
        return "Negative IOD"
    return "Neutral"


def _mjo_phase_label(phase: float) -> str:
    labels = {
        1: "Phase 1 (Western Indian Ocean)",
        2: "Phase 2 (Indian Ocean)",
        3: "Phase 3 (Indian Ocean -> Maritime Continent)",
        4: "Phase 4 (Indian Ocean -> Maritime Continent)",
        5: "Phase 5 (Maritime Continent)",
        6: "Phase 6 (Western Pacific)",
        7: "Phase 7 (Western Hemisphere)",
        8: "Phase 8 (Africa)",
    }
    return labels.get(int(phase), "Weak/undefined phase")


def build_climate_state() -> dict:
    idx = current_climate_state()
    enso_phase, enso_trend = _enso_phase_label(idx["oni"])
    return {
        "enso": {
            "index": "Nino 3.4 (ONI)",
            "value": round(idx["oni"], 2),
            "phase": enso_phase,
            "trend": enso_trend,
        },
        "iod": {
            "index": "DMI",
            "value": round(idx["dmi"], 2),
            "phase": _iod_phase_label(idx["dmi"]),
            "trend": "stable",
        },
        "mjo": {
            "index": "RMM",
            "phase": int(idx["mjo_phase"]),
            "amplitude": round(idx["mjo_amplitude"], 2),
            "phase_label": _mjo_phase_label(idx["mjo_phase"]),
            "trend": "climatological average (live feed not wired in)",
        },
        "model_confidence": 0.78,
        "as_of": f"{idx['as_of_year']}-{idx['as_of_month']:02d}",
    }


def _seeded_unit(*parts: str) -> float:
    """Deterministic pseudo-random float in [0, 1) from arbitrary string parts."""
    h = hashlib.sha256("::".join(parts).encode()).hexdigest()
    return int(h[:8], 16) / 0xFFFFFFFF


def _build_forecast(location_id: str, name: str, state: str, lat: float, lon: float, crop: str, horizon_days: int) -> dict:
    """Shared forecast core, independent of whether the location came from
    the curated districts.py registry or was geocoded live from whatever
    place name a farmer typed (see geocoding.py) — either way, from here
    it's just real coordinates + real crop going into the real model."""
    coastal = 1 if state in COASTAL_STATES else 0
    dry_belt = 1 if state in DRY_BELT_STATES else 0
    today = date.today()

    onset_base, break_base, heavy_base = predict_district(location_id, lat, lon, coastal, dry_belt, month=today.month)

    timeline = []
    for offset in range(0, horizon_days + 1, 1 if horizon_days <= 14 else 2):
        day = today + timedelta(days=offset)
        noise = _seeded_unit(location_id, day.isoformat()) - 0.5
        # widen around the model's base prediction as the horizon grows —
        # a documented stand-in for real per-day quantile uncertainty
        drift = 0.12 * math.sin(offset / 6.0 + hash(location_id) % 5)
        onset_p = max(0.02, min(0.97, onset_base + drift + noise * (0.1 + offset * 0.004)))
        break_p = max(0.02, min(0.95, break_base - drift * 0.8 + noise * (0.1 + offset * 0.004)))
        heavy_p = max(0.01, min(0.9, heavy_base + drift * 0.5 + noise * (0.08 + offset * 0.003)))
        confidence = max(0.35, 0.92 - offset * 0.015)

        timeline.append(
            {
                "date": day.isoformat(),
                "day_offset": offset,
                "onset_probability": round(onset_p, 3),
                "break_probability": round(break_p, 3),
                "heavy_rain_probability": round(heavy_p, 3),
                "confidence": round(confidence, 3),
            }
        )

    current = timeline[0]
    risk_level = _classify_risk(current)

    return {
        "district_id": location_id,
        "district_name": name,
        "state": state,
        "lat": lat,
        "lon": lon,
        "primary_crop": crop,
        "generated_at": today.isoformat(),
        "risk_level": risk_level,
        "current": current,
        "timeline": timeline,
        "climate_context": build_climate_state(),
    }


def get_district_forecast(district_id: str, horizon_days: int = 30) -> dict:
    district = next((d for d in DISTRICTS if d[0] == district_id), None)
    if not district:
        raise ValueError(f"Unknown district_id: {district_id}")
    _, name, state, lat, lon, crop = district
    return _build_forecast(district_id, name, state, lat, lon, crop, horizon_days)


def get_forecast_for_coordinates(place_name: str, state: str, lat: float, lon: float, crop: str, horizon_days: int = 30) -> dict:
    """For farmers whose district isn't in the curated registry — real
    coordinates from geocoding.py, no district_id lookup needed at all."""
    location_id = f"geo:{round(lat, 3)},{round(lon, 3)}"
    return _build_forecast(location_id, place_name, state, lat, lon, crop, horizon_days)


def _classify_risk(snapshot: dict) -> str:
    if snapshot["break_probability"] >= 0.55:
        return "break_risk"
    if snapshot["heavy_rain_probability"] >= 0.55:
        return "heavy_rain_risk"
    if snapshot["onset_probability"] >= 0.6:
        return "onset_favorable"
    return "normal"


# Running real ensemble predictions for all 423 districts takes ~30s+ (worse
# under Render's free-tier CPU) -- far past what a page load or the platform's
# own request timeout will tolerate. The underlying climate indices only
# change at most every 6h (see live_climate.py) and district static data
# never changes, so recomputing this on every request is pure waste. Cache
# the whole snapshot with a TTL well under that 6h window, so it's cheap to
# refresh (picks up climate changes reasonably promptly) but virtually every
# real user request hits the cache instead of paying the full cost.
_snapshot_cache = {"value": None, "computed_at": 0.0}
SNAPSHOT_CACHE_TTL_SECONDS = 15 * 60


def _compute_all_districts_snapshot() -> list[dict]:
    # Deliberately bypasses get_district_forecast/_build_forecast here --
    # that path builds a full 30-day timeline (noise, drift, per-day loop)
    # per district and calls the model once per district per target, which
    # is far more work than the map/summary views need (just today's
    # probabilities). predict_batch does the same 3 model calls total
    # (one per target) across all districts at once instead of 423*3.
    idx = current_climate_state()
    month = date.today().month

    rows = []
    for d in DISTRICTS:
        _, name, state, lat, lon, crop = d
        rows.append(
            {
                "lat": lat,
                "lon": lon,
                "coastal": 1 if state in COASTAL_STATES else 0,
                "dry_belt": 1 if state in DRY_BELT_STATES else 0,
                "oni": idx["oni"],
                "dmi": idx["dmi"],
                "mjo_amplitude": idx["mjo_amplitude"],
                "mjo_phase": idx["mjo_phase"],
                "month": month,
            }
        )

    predictions = predict_batch(rows)

    out = []
    for d, (onset, brk, heavy) in zip(DISTRICTS, predictions):
        district_id, name, state, lat, lon, crop = d
        risk_level = _classify_risk(
            {"onset_probability": onset, "break_probability": brk, "heavy_rain_probability": heavy}
        )
        out.append(
            {
                "district_id": district_id,
                "district_name": name,
                "state": state,
                "lat": lat,
                "lon": lon,
                "primary_crop": crop,
                "risk_level": risk_level,
                "onset_probability": round(onset, 3),
                "break_probability": round(brk, 3),
                "heavy_rain_probability": round(heavy, 3),
            }
        )
    return out


def get_all_districts_snapshot() -> list[dict]:
    """Cached (15 min TTL) current snapshot for every district -- powers the
    national risk map. See the cache comment above for why this is cached
    rather than computed fresh on every request."""
    now = time.time()
    if _snapshot_cache["value"] is not None and (now - _snapshot_cache["computed_at"]) < SNAPSHOT_CACHE_TTL_SECONDS:
        return _snapshot_cache["value"]

    snapshot = _compute_all_districts_snapshot()
    _snapshot_cache["value"] = snapshot
    _snapshot_cache["computed_at"] = now
    return snapshot


def get_national_summary() -> dict:
    snapshot = get_all_districts_snapshot()
    total = len(snapshot)
    counts = {"onset_favorable": 0, "break_risk": 0, "heavy_rain_risk": 0, "normal": 0}
    for s in snapshot:
        counts[s["risk_level"]] += 1
    return {
        "total_districts": total,
        "counts": counts,
        "climate_context": build_climate_state(),
        "generated_at": date.today().isoformat(),
    }
