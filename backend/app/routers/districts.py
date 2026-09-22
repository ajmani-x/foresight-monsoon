from fastapi import APIRouter, HTTPException

from app.data.districts import DISTRICTS
from app.services.mock_data import get_all_districts_snapshot, get_national_summary

router = APIRouter(prefix="/api/districts", tags=["districts"])


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
