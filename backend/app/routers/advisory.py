from dataclasses import asdict

from fastapi import APIRouter, HTTPException

from app.services.advisory_engine import generate_advisory
from app.services.mock_data import get_all_districts_snapshot, get_district_forecast

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
    dashboard's live advisory feed panel.

    Reuses the cached, batch-computed district snapshot (see mock_data.py)
    instead of calling get_district_forecast per district -- that path builds
    a full per-district timeline via individual (non-batched) model calls,
    which is the same O(423) inference bottleneck already fixed for the map
    endpoint. Left un-fixed here, it hangs for minutes under Render's
    throttled free-tier CPU and stalls the whole dashboard's boot sequence.
    generate_advisory only reads forecast["current"] and ["primary_crop"], so
    a lightweight dict built from the snapshot row is enough.
    """
    severity_rank = {"critical": 3, "warning": 2, "caution": 1, "info": 0}
    items = []
    for row in get_all_districts_snapshot():
        forecast = {
            "primary_crop": row["primary_crop"],
            "current": {
                "onset_probability": row["onset_probability"],
                "break_probability": row["break_probability"],
                "heavy_rain_probability": row["heavy_rain_probability"],
            },
        }
        advisory = generate_advisory(forecast)
        items.append(
            {
                "district_id": row["district_id"],
                "district_name": row["district_name"],
                "state": row["state"],
                "primary_crop": row["primary_crop"],
                "advisory": asdict(advisory),
            }
        )
    items.sort(key=lambda x: severity_rank[x["advisory"]["severity"]], reverse=True)
    return items[:limit]
