"""
Deterministic mock forecast generator.

Stands in for the trained model stack (teleconnection encoder -> spatial-temporal
GNN/TFT core -> XGBoost calibration) that gets wired in tomorrow. Every function here
returns data shaped EXACTLY like the real inference output will be, so swapping the
mock for `app/models/inference.py` tomorrow requires no changes to routers or frontend.

Determinism (seeded by district id + day) keeps numbers stable across refreshes/demo
runs instead of jittering randomly on every request.
"""

import hashlib
import math
from datetime import date, timedelta

from app.data.districts import DISTRICTS

# --- Global climate index context (same for all districts on a given day) ---
# Stands in for M2's teleconnection encoder output.
CLIMATE_STATE = {
    "enso": {
        "index": "Nino 3.4",
        "value": -0.4,
        "phase": "Weak La Nina",
        "trend": "weakening",
    },
    "iod": {
        "index": "DMI",
        "value": 0.18,
        "phase": "Neutral, slightly positive",
        "trend": "stable",
    },
    "mjo": {
        "index": "RMM",
        "phase": 4,
        "amplitude": 1.35,
        "phase_label": "Phase 4 (Indian Ocean -> Maritime Continent)",
        "trend": "propagating eastward",
    },
    "model_confidence": 0.78,
    "as_of": date.today().isoformat(),
}


def _seeded_unit(*parts: str) -> float:
    """Deterministic pseudo-random float in [0, 1) from arbitrary string parts."""
    h = hashlib.sha256("::".join(parts).encode()).hexdigest()
    return int(h[:8], 16) / 0xFFFFFFFF


def _district_base_signal(district_id: str) -> float:
    """A stable per-district bias so the map has believable regional clustering
    (e.g. western Maharashtra/Marathwada trending drier than coastal Kerala)."""
    lat_lon = next((d for d in DISTRICTS if d[0] == district_id), None)
    if not lat_lon:
        return 0.5
    _, _, state, lat, lon, _ = lat_lon
    # crude coastal/western-dry-belt heuristic purely for believable demo variance
    coastal_bonus = 0.15 if state in ("Kerala", "Karnataka", "Goa", "West Bengal", "Odisha", "Assam") else 0.0
    dry_belt_penalty = 0.15 if state in ("Rajasthan", "Gujarat", "Maharashtra", "Telangana") else 0.0
    return max(0.05, min(0.95, 0.5 + coastal_bonus - dry_belt_penalty))


def get_district_forecast(district_id: str, horizon_days: int = 30) -> dict:
    district = next((d for d in DISTRICTS if d[0] == district_id), None)
    if not district:
        raise ValueError(f"Unknown district_id: {district_id}")

    _, name, state, lat, lon, crop = district
    base = _district_base_signal(district_id)
    today = date.today()

    timeline = []
    for offset in range(0, horizon_days + 1, 1 if horizon_days <= 14 else 2):
        day = today + timedelta(days=offset)
        noise = _seeded_unit(district_id, day.isoformat()) - 0.5
        # probability decays in confidence and drifts with a slow oscillation the
        # further out the forecast horizon goes (stand-in for TFT quantile spread)
        onset_p = max(0.02, min(0.97, base + 0.25 * math.sin(offset / 6.0) + noise * 0.18))
        break_p = max(0.02, min(0.95, (1 - base) * 0.6 + 0.2 * math.cos(offset / 5.0) + noise * 0.2))
        heavy_p = max(0.01, min(0.9, base * 0.4 + 0.15 * math.sin(offset / 4.0 + 1) + noise * 0.15))
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
        "district_id": district_id,
        "district_name": name,
        "state": state,
        "lat": lat,
        "lon": lon,
        "primary_crop": crop,
        "generated_at": today.isoformat(),
        "risk_level": risk_level,
        "current": current,
        "timeline": timeline,
        "climate_context": CLIMATE_STATE,
    }


def _classify_risk(snapshot: dict) -> str:
    if snapshot["break_probability"] >= 0.55:
        return "break_risk"
    if snapshot["heavy_rain_probability"] >= 0.55:
        return "heavy_rain_risk"
    if snapshot["onset_probability"] >= 0.6:
        return "onset_favorable"
    return "normal"


def get_all_districts_snapshot() -> list[dict]:
    """Lightweight per-district current snapshot for the national risk map."""
    out = []
    for d in DISTRICTS:
        district_id = d[0]
        forecast = get_district_forecast(district_id, horizon_days=1)
        out.append(
            {
                "district_id": forecast["district_id"],
                "district_name": forecast["district_name"],
                "state": forecast["state"],
                "lat": forecast["lat"],
                "lon": forecast["lon"],
                "primary_crop": forecast["primary_crop"],
                "risk_level": forecast["risk_level"],
                "onset_probability": forecast["current"]["onset_probability"],
                "break_probability": forecast["current"]["break_probability"],
                "heavy_rain_probability": forecast["current"]["heavy_rain_probability"],
            }
        )
    return out


def get_national_summary() -> dict:
    snapshot = get_all_districts_snapshot()
    total = len(snapshot)
    counts = {"onset_favorable": 0, "break_risk": 0, "heavy_rain_risk": 0, "normal": 0}
    for s in snapshot:
        counts[s["risk_level"]] += 1
    return {
        "total_districts": total,
        "counts": counts,
        "climate_context": CLIMATE_STATE,
        "generated_at": date.today().isoformat(),
    }
