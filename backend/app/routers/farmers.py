from fastapi import APIRouter, HTTPException

from app.data.districts import DISTRICTS
from app.services.farmer_store import FarmerProfile, get_farmer, list_farmers, upsert_farmer
from app.services.llm_advisory import generate_personalized_advisory
from app.services.mock_data import get_district_forecast

router = APIRouter(prefix="/api/farmers", tags=["farmers"])

VALID_DISTRICT_IDS = {d[0] for d in DISTRICTS}


@router.post("")
def create_or_update_farmer(profile: FarmerProfile):
    """Upsert a farmer profile, keyed by phone number.

    Called by the WhatsApp gateway when a farmer first messages the bot
    (or updates their details) — e.g. after collecting name/district/crops
    through a WhatsApp conversation flow.
    """
    if profile.district_id not in VALID_DISTRICT_IDS:
        raise HTTPException(status_code=400, detail=f"Unknown district_id: {profile.district_id}")
    return upsert_farmer(profile)


@router.get("/{phone}")
def read_farmer(phone: str):
    farmer = get_farmer(phone)
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    return farmer


@router.get("")
def all_farmers():
    return list_farmers()


@router.post("/{phone}/advisory")
def farmer_advisory(phone: str):
    """Generate a personalized advisory message for this farmer, ready to
    send via WhatsApp. Grounded in the real model forecast for their
    district; LLM only personalizes tone/language (see llm_advisory.py).
    Falls back to the plain rule-based advisory if no LLM API key is
    configured yet (llm_generated: false in the response)."""
    farmer = get_farmer(phone)
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    try:
        forecast = get_district_forecast(farmer.district_id, horizon_days=1)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid district for farmer: {farmer.district_id}")

    return generate_personalized_advisory(farmer, forecast)
