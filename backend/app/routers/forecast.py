from fastapi import APIRouter, HTTPException, Query

from app.services.mock_data import build_climate_state, get_district_forecast

router = APIRouter(prefix="/api/forecast", tags=["forecast"])


@router.get("/climate")
def climate_context():
    """Global teleconnection state (ENSO / IOD / MJO), decoded from the real
    current index snapshot into human-readable form."""
    return build_climate_state()


@router.get("/{district_id}")
def district_forecast(district_id: str, horizon_days: int = Query(30, ge=1, le=30)):
    try:
        return get_district_forecast(district_id.upper(), horizon_days=horizon_days)
    except ValueError:
        raise HTTPException(status_code=404, detail=f"District '{district_id}' not found")
