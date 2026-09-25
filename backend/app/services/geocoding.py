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

import requests

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "ForesightMonsoonApp/1.0 (SIH26086, contact: aryanajmani7@gmail.com)"


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
