"""
Live fetch of today's real ENSO (ONI), IOD (DMI), and MJO (RMM) values
directly from NOAA CPC / NOAA PSL / BoM, at request time -- not a frozen
file. Cached in-process for a few hours (these indices don't change
faster than that; there is no reason to hit the source on every single
request) with a graceful fallback to the last known-good value if a
source is slow/unreachable at that moment, so a live-fetch failure never
breaks a district prediction.
"""

import re
import time

import requests

ONI_URL = "https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt"
DMI_URL = "https://psl.noaa.gov/gcos_wgsp/Timeseries/Data/dmi.had.long.data"
MJO_URL = "http://www.bom.gov.au/climate/mjo/graphics/rmm.74toRealtime.txt"

CACHE_TTL_SECONDS = 6 * 60 * 60  # 6 hours -- these indices update at most daily
REQUEST_TIMEOUT = 8  # seconds; fail fast and fall back rather than hang a request

_cache = {"value": None, "fetched_at": 0}


def _fetch_oni():
    r = requests.get(ONI_URL, timeout=REQUEST_TIMEOUT)
    r.raise_for_status()
    lines = [l for l in r.text.splitlines() if l.strip()]
    last = lines[-1].split()
    seas, year, total, anom = last[0], int(last[1]), float(last[2]), float(last[3])
    seas_to_month = {"DJF": 1, "JFM": 2, "FMA": 3, "MAM": 4, "AMJ": 5, "MJJ": 6,
                      "JJA": 7, "JAS": 8, "ASO": 9, "SON": 10, "OND": 11, "NDJ": 12}
    return anom, year, seas_to_month.get(seas, 1)


def _fetch_dmi():
    r = requests.get(DMI_URL, timeout=REQUEST_TIMEOUT)
    r.raise_for_status()
    lines = r.text.splitlines()
    for line in reversed(lines):
        parts = line.split()
        if len(parts) != 13:
            continue
        try:
            year = int(parts[0])
        except ValueError:
            continue
        for m in range(12, 0, -1):
            val = float(parts[m])
            if val > -90:  # not the missing-value sentinel
                return val, year, m
    raise ValueError("No valid DMI row found")


def _fetch_mjo():
    r = requests.get(
        MJO_URL,
        timeout=REQUEST_TIMEOUT,
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
    )
    r.raise_for_status()
    lines = [l for l in r.text.splitlines() if l.strip()][2:]  # skip 2 header lines
    for line in reversed(lines):
        parts = re.split(r"\s+", line.strip())
        if len(parts) < 7:
            continue
        try:
            amplitude = float(parts[6])
            phase = float(parts[5])
        except ValueError:
            continue
        if abs(amplitude) > 100 or not (1 <= phase <= 8):
            continue  # missing-value sentinel
        return amplitude, int(phase)
    raise ValueError("No valid MJO row found")


def fetch_live_indices() -> dict | None:
    """Best-effort live fetch of all three indices. Returns None (not a
    partial result) if any one fails, so callers can cleanly fall back to
    the last known-good snapshot instead of mixing live and stale data."""
    try:
        oni, oni_year, oni_month = _fetch_oni()
        dmi, dmi_year, dmi_month = _fetch_dmi()
        mjo_amplitude, mjo_phase = _fetch_mjo()
    except Exception as e:
        print(f"[live_climate] live fetch failed, will fall back: {e}")
        return None

    return {
        "oni": oni,
        "dmi": dmi,
        "mjo_amplitude": mjo_amplitude,
        "mjo_phase": float(mjo_phase),
        "as_of_year": oni_year,
        "as_of_month": oni_month,
        "live": True,
    }


def get_cached_or_live_indices(fallback: dict) -> dict:
    """Returns cached live indices if fresh (< CACHE_TTL_SECONDS old);
    otherwise attempts a fresh live fetch and caches it; falls back to
    `fallback` (the static file snapshot) if the live fetch fails."""
    now = time.time()
    if _cache["value"] is not None and (now - _cache["fetched_at"]) < CACHE_TTL_SECONDS:
        return _cache["value"]

    live = fetch_live_indices()
    if live is not None:
        _cache["value"] = live
        _cache["fetched_at"] = now
        return live

    # live fetch failed -- reuse the old cached value if we have one at all,
    # even if stale, before falling all the way back to the static file
    if _cache["value"] is not None:
        return _cache["value"]
    return {**fallback, "live": False}
