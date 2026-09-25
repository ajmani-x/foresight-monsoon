import threading

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import advisory, districts, farmers, forecast, whatsapp
from app.services.mock_data import get_all_districts_snapshot

app = FastAPI(
    title="Foresight API",
    description="Hyperlocal monsoon onset & break prediction system (block/district scale)",
    version="0.1.0",
)


@app.on_event("startup")
def _warm_district_snapshot_cache():
    # Computing all 423 districts' predictions takes 30s+ -- run it once in
    # the background at boot so the first real request after a deploy hits a
    # warm cache instead of paying that cost (and risking a platform-level
    # request timeout). See mock_data.py's snapshot cache comment.
    threading.Thread(target=get_all_districts_snapshot, daemon=True).start()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(districts.router)
app.include_router(forecast.router)
app.include_router(advisory.router)
app.include_router(farmers.router)
app.include_router(whatsapp.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "foresight-api"}
