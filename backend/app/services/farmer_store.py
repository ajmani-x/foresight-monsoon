"""
Farmer profile storage.

Deliberately a simple JSON-file-backed store, not a database — consistent
with this project's "no DB unless explicitly asked" convention, while still
persisting across backend restarts (unlike an in-memory dict). Phone number
is the unique key (it's what ties a WhatsApp conversation to a profile).

Swap this for a real database when farmer volume outgrows a single JSON
file — nothing in the router or the LLM advisory service needs to change,
since they only call get_farmer / upsert_farmer / list_farmers.
"""

import json
import threading
from pathlib import Path
from typing import Literal, Optional

from pydantic import BaseModel, Field

STORE_PATH = Path(__file__).resolve().parent.parent / "data" / "farmers_store.json"
_lock = threading.Lock()


class FarmerProfile(BaseModel):
    phone: str = Field(..., description="WhatsApp number, unique identifier")
    name: str
    district_id: str
    crops: list[str] = Field(default_factory=list)
    land_size_acres: Optional[float] = None
    irrigation_access: bool = False
    language: Literal["en", "hi"] = "en"


def _read_all() -> dict:
    if not STORE_PATH.exists():
        return {}
    with open(STORE_PATH) as f:
        return json.load(f)


def _write_all(data: dict) -> None:
    STORE_PATH.parent.mkdir(exist_ok=True)
    with open(STORE_PATH, "w") as f:
        json.dump(data, f, indent=2)


def upsert_farmer(profile: FarmerProfile) -> FarmerProfile:
    with _lock:
        data = _read_all()
        data[profile.phone] = profile.model_dump()
        _write_all(data)
    return profile


def get_farmer(phone: str) -> Optional[FarmerProfile]:
    data = _read_all()
    record = data.get(phone)
    return FarmerProfile(**record) if record else None


def list_farmers() -> list[FarmerProfile]:
    data = _read_all()
    return [FarmerProfile(**record) for record in data.values()]
