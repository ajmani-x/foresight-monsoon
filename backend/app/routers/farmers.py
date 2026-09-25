from typing import Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.farmer_store import FarmerProfile, get_farmer, list_farmers, upsert_farmer
from app.services.geocoding import geocode_place
from app.services.llm_advisory import generate_personalized_advisory
from app.services.mock_data import get_forecast_for_coordinates

router = APIRouter(prefix="/api/farmers", tags=["farmers"])


class FarmerCreateRequest(BaseModel):
    """What the WhatsApp gateway actually sends — a free-text district name
    the farmer typed/said, not a pre-validated ID from any fixed list."""

    phone: str
    name: str
    district_name: str = Field(..., description="Whatever place name the farmer typed, e.g. 'Nellore'")
    crops: list[str] = Field(default_factory=list)
    land_size_acres: Optional[float] = None
    irrigation_access: bool = False
    language: Literal["en", "hi"] = "en"


@router.post("")
def create_or_update_farmer(req: FarmerCreateRequest):
    """Upsert a farmer profile, keyed by phone number.

    Called by the WhatsApp gateway when a farmer first messages the bot
    (or updates their details). The district name is geocoded here (real
    coordinates via OpenStreetMap, not a lookup against a fixed list) —
    any real Indian place name works, not just a curated set.
    """
    geo = geocode_place(req.district_name)
    if geo is None:
        raise HTTPException(
            status_code=400,
            detail=f"Couldn't find '{req.district_name}' — check the spelling or try a nearby larger town/city name",
        )

    profile = FarmerProfile(
        phone=req.phone,
        name=req.name,
        district_name=req.district_name,
        lat=geo["lat"],
        lon=geo["lon"],
        state=geo["state"],
        crops=req.crops,
        land_size_acres=req.land_size_acres,
        irrigation_access=req.irrigation_access,
        language=req.language,
    )
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
    send via WhatsApp. Grounded in the real model forecast for their real
    geocoded location; LLM only personalizes tone/language (see
    llm_advisory.py). Falls back to the plain rule-based advisory if no
    LLM API key is configured yet (llm_generated: false in the response)."""
    farmer = get_farmer(phone)
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")

    primary_crop = farmer.crops[0] if farmer.crops else "Mixed crops"
    forecast = get_forecast_for_coordinates(
        farmer.district_name, farmer.state, farmer.lat, farmer.lon, primary_crop, horizon_days=1
    )
    return generate_personalized_advisory(farmer, forecast)
