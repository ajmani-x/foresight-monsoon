from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import advisory, districts, farmers, forecast, whatsapp

app = FastAPI(
    title="Foresight API",
    description="Hyperlocal monsoon onset & break prediction system (block/district scale)",
    version="0.1.0",
)

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
