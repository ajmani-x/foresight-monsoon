"""
Farmer profile storage.

Backed by Postgres (see db.py) rather than a local file — a JSON file on
Render's free-tier filesystem gets wiped on every redeploy, which meant
every registered farmer disappeared each time the backend was updated.
Phone number is the unique key (it's what ties a WhatsApp conversation to
a profile).
"""

from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.services import db

NAMESPACE = "farmers"


class FarmerProfile(BaseModel):
    phone: str = Field(..., description="WhatsApp number, unique identifier")
    name: str
    district_name: str = Field(..., description="Whatever place name the farmer typed/said")
    lat: float = Field(..., description="Geocoded at profile-creation time — see geocoding.py")
    lon: float
    state: str = Field(..., description="Resolved from geocoding, used for coastal/dry_belt")
    crops: list[str] = Field(default_factory=list)
    land_size_acres: Optional[float] = None
    irrigation_access: bool = False
    language: Literal["en", "hi"] = "en"


def upsert_farmer(profile: FarmerProfile) -> FarmerProfile:
    db.set(NAMESPACE, profile.phone, profile.model_dump())
    return profile


def get_farmer(phone: str) -> Optional[FarmerProfile]:
    record = db.get(NAMESPACE, phone)
    return FarmerProfile(**record) if record else None


def list_farmers() -> list[FarmerProfile]:
    return [FarmerProfile(**record) for record in db.list_all(NAMESPACE)]
