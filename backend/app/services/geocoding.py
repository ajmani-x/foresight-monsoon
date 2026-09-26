"""
Geocodes whatever district/place name a farmer types (e.g. via the
WhatsApp intake flow) into real coordinates, using OpenStreetMap's free
Nominatim API -- no API key, no fixed district registry needed. This is
the real fix for "what if a farmer's district isn't in our list": there
is no list. Any real Indian place name that OpenStreetMap knows about
(which is effectively all of them) works.

Nominatim's usage policy caps this at ~1 request/second and asks for a
descriptive User-Agent -- both fine here since this only runs once per
farmer, at profile-creation time, not per-prediction-request.
"""

import math

import requests

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "ForesightMonsoonApp/1.0 (SIH26086, contact: aryanajmani7@gmail.com)"


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in km between two lat/lon points -- used to
    match a geocoded farmer to a nearby curated district, since a farmer's
    free-text place name rarely matches a curated district name exactly."""
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def geocode_place(name: str) -> dict | None:
    """Returns {lat, lon, state, display_name} for a place name, or None
    if it couldn't be found. `name` should be a district/city/town name;
    "India" is appended automatically to disambiguate from places with
    the same name elsewhere in the world."""
    try:
        r = requests.get(
            NOMINATIM_URL,
            params={
                "q": f"{name}, India",
                "format": "json",
                "limit": 1,
                "addressdetails": 1,
            },
            headers={"User-Agent": USER_AGENT},
            timeout=8,
        )
        r.raise_for_status()
        results = r.json()
        if not results:
            return None

        result = results[0]
        address = result.get("address", {})
        state = address.get("state")
        if not state:
            return None  # need a state to compute coastal/dry_belt

        return {
            "lat": float(result["lat"]),
            "lon": float(result["lon"]),
            "state": state,
            "display_name": result.get("display_name", name),
        }
    except Exception as e:
        print(f"[geocoding] failed for '{name}': {e}")
        return None
