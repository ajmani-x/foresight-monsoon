# Foresight — Hyperlocal Monsoon Onset & Break Prediction System

SIH26086 · Ministry of Earth Sciences (NCMRWF)

## Run it

**Backend (FastAPI, port 8000)**
```
cd backend
source venv/bin/activate   # venv already created + deps installed
uvicorn app.main:app --reload --port 8000
```

**Frontend (React + Vite, port 5173, proxies /api -> :8000)**
```
cd frontend
npm run dev
```

Open http://localhost:5173

## What's wired up tonight

- Full FastAPI backend: `/api/districts`, `/api/districts/map`, `/api/districts/summary`,
  `/api/forecast/{id}`, `/api/forecast/climate`, `/api/advisory/{id}`, `/api/advisory`
- 74-district curated dataset across all major agri states (`backend/app/data/districts.py`)
- **Rule-based advisory engine is fully real** — not mocked (`backend/app/services/advisory_engine.py`)
- Deterministic mock forecast generator standing in for the trained models
  (`backend/app/services/mock_data.py`) — shaped exactly like real inference output
- Full React frontend: hero, climate context (ENSO/IOD/MJO), interactive India district
  risk map, 30-day forecast chart, bilingual (EN/HI) advisory panel, national advisory
  feed, model architecture section

## Tomorrow: wiring in the trained models

Only one file needs to change: `backend/app/services/mock_data.py`.

Replace `get_district_forecast()` and `get_all_districts_snapshot()` with calls into
`backend/app/models/inference.py` (currently empty — drop trained model loading +
inference there). Keep the exact same return shape (see docstrings in `mock_data.py`)
and nothing else in the routers, advisory engine, or frontend needs to change.

Suggested model modules to build tomorrow (`backend/app/models/`):
- `teleconnection_encoder.py` — LSTM/Transformer over ENSO/IOD/MJO -> embedding
- `spatial_downscaling.py` — GNN over district adjacency -> local rainfall signal
- `temporal_forecast.py` — TFT quantile head -> 7/30-day probabilities
- `calibration.py` — XGBoost ensemble blending the above
