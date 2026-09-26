from fastapi import APIRouter, HTTPException

from app.data.districts import DISTRICTS
from app.services.farmer_store import list_farmers
from app.services.geocoding import haversine_km
from app.services.mock_data import get_all_districts_snapshot, get_national_summary

router = APIRouter(prefix="/api/districts", tags=["districts"])

NEARBY_FARMER_RADIUS_KM = 60


def _mask_phone(phone: str) -> str:
    if len(phone) <= 6:
        return "*" * len(phone)
    return f"{phone[:3]}{'*' * (len(phone) - 6)}{phone[-3:]}"


@router.get("")
def list_districts():
    return [
        {"district_id": d[0], "name": d[1], "state": d[2], "lat": d[3], "lon": d[4], "primary_crop": d[5]}
        for d in DISTRICTS
    ]


@router.get("/map")
def districts_map():
    """Current risk snapshot for every district -- powers the national map."""
    return get_all_districts_snapshot()


@router.get("/summary")
def national_summary():
    return get_national_summary()


@router.get("/{district_id}/farmers")
def district_farmers(district_id: str):
    """Registered WhatsApp farmers near this district -- matched by
    geographic proximity (not name), since a farmer's free-text place name
    from WhatsApp intake rarely matches a curated district name exactly."""
    district = next((d for d in DISTRICTS if d[0] == district_id), None)
    if not district:
        raise HTTPException(status_code=404, detail=f"Unknown district_id: {district_id}")
    _, name, state, lat, lon, _crop = district

    nearby = []
    for farmer in list_farmers():
        distance_km = haversine_km(lat, lon, farmer.lat, farmer.lon)
        if distance_km <= NEARBY_FARMER_RADIUS_KM:
            nearby.append(
                {
                    "name": farmer.name,
                    "district_name": farmer.district_name,
                    "crops": farmer.crops,
                    "land_size_acres": farmer.land_size_acres,
                    "irrigation_access": farmer.irrigation_access,
                    "language": farmer.language,
                    "phone_masked": _mask_phone(farmer.phone),
                    "distance_km": round(distance_km, 1),
                }
            )
    nearby.sort(key=lambda f: f["distance_km"])

    return {
        "district_id": district_id,
        "district_name": name,
        "state": state,
        "radius_km": NEARBY_FARMER_RADIUS_KM,
        "farmers": nearby,
    }
