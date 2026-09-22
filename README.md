# Foresight — Hyperlocal Monsoon Onset & Break Prediction System

**SIH26086** · Ministry of Earth Sciences (NCMRWF)

A hybrid deep learning pipeline that turns global climate teleconnections (ENSO,
IOD, MJO) into a 7-to-30-day probabilistic outlook of monsoon onset, break, and
heavy-rain risk at the block/district scale — paired with a rule-based expert
system that translates those probabilities into crop-specific, bilingual (EN/HI)
farmer advisories.

## Features

- **National risk map** — live district-level onset/break/heavy-rain probability
  across 74 curated agri-districts, rendered on an accurate India topojson map
- **30-day forecast timeline** — probabilistic quantile outlook per district
- **Climate context panel** — decoded ENSO/IOD/MJO teleconnection state
- **Advisory engine** — explainable, rule-based crop advisories (delay sowing,
  irrigate, switch crop, etc.) in English and Hindi
- **Live advisory feed** — national feed of highest-severity alerts, ranked by
  urgency, styled for last-mile delivery (WhatsApp/SMS-ready)

## Architecture

| Stage | Role |
|---|---|
| Teleconnection Encoder | LSTM/Transformer over ENSO/IOD/MJO time series → latent global climate-state embedding |
| Spatial Downscaling | Graph Neural Network over the district adjacency graph → local rainfall signature |
| Temporal Forecasting Head | Temporal Fusion Transformer → 7-30 day quantile probabilities |
| Calibration Ensemble | XGBoost blending DL outputs against historical break-monsoon labels |
| Advisory Engine | Rule-based expert system mapping calibrated probabilities + crop stage → farmer actions |

The model layer (`backend/app/models/`) is currently backed by a deterministic
mock generator (`backend/app/services/mock_data.py`) that returns data in the
exact shape real model inference will produce, so the trained models can be
dropped in without touching routers or the frontend. The advisory engine
(`backend/app/services/advisory_engine.py`) is a real, fully rule-based system —
not mocked.

## Tech stack

- **Backend:** FastAPI (Python)
- **Frontend:** React + Vite + Tailwind CSS v4, Framer Motion, Recharts, react-simple-maps

## Getting started

**Backend**
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 (the dev server proxies `/api` requests to the
backend on port 8000).

## Project structure

```
backend/
  app/
    main.py               FastAPI app, CORS, router mounting
    routers/               districts.py, forecast.py, advisory.py
    services/
      mock_data.py         Forecast data generator (model stand-in)
      advisory_engine.py   Rule-based crop advisory engine
    data/districts.py      Curated district dataset
    models/                Trained model inference (to be added)
frontend/
  src/
    App.jsx                 Top-level data fetching + layout
    components/              UI sections (Hero, RiskMap, ForecastPanel, ...)
    lib/                     API client, shared risk/severity styling
    hooks/                   Small reusable hooks
```

## Data sources

IMD gridded daily rainfall (0.25°) · NOAA ENSO (Niño 3.4) · BoM IOD/DMI ·
BoM MJO (RMM1/RMM2) · ERA5 reanalysis (humidity, wind shear, soil moisture, SST) ·
ICAR crop calendars for advisory mapping.
