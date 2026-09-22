from dataclasses import asdict

from fastapi import APIRouter, HTTPException

from app.data.districts import DISTRICTS
from app.services.advisory_engine import generate_advisory
from app.services.mock_data import get_district_forecast

router = APIRouter(prefix="/api/advisory", tags=["advisory"])


@router.get("/{district_id}")
def district_advisory(district_id: str):
    try:
        forecast = get_district_forecast(district_id.upper(), horizon_days=1)
    except ValueError:
        raise HTTPException(status_code=404, detail=f"District '{district_id}' not found")

    advisory = generate_advisory(forecast)
    return {
        "district_id": forecast["district_id"],
        "district_name": forecast["district_name"],
        "state": forecast["state"],
        "primary_crop": forecast["primary_crop"],
        "advisory": asdict(advisory),
    }


@router.get("")
def national_advisory_feed(limit: int = 12):
    """Feed of the highest-severity advisories across all districts, for the
    dashboard's live advisory feed panel."""
    severity_rank = {"critical": 3, "warning": 2, "caution": 1, "info": 0}
    items = []
    for d in DISTRICTS:
        forecast = get_district_forecast(d[0], horizon_days=1)
        advisory = generate_advisory(forecast)
        items.append(
            {
                "district_id": forecast["district_id"],
                "district_name": forecast["district_name"],
                "state": forecast["state"],
                "primary_crop": forecast["primary_crop"],
                "advisory": asdict(advisory),
            }
        )
    items.sort(key=lambda x: severity_rank[x["advisory"]["severity"]], reverse=True)
    return items[:limit]
