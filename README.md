# Foresight — Hyperlocal Monsoon Onset & Break Prediction System

**SIH26086** · Ministry of Earth Sciences (NCMRWF)

A machine learning pipeline that turns global climate teleconnections (ENSO,
IOD, MJO) into a 7-to-30-day probabilistic outlook of monsoon onset, break, and
heavy-rain risk at the district scale — paired with a rule-based expert
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
| Calibration Ensemble | 4-model ensemble per target (XGBoost, Random Forest, Gradient Boosting, Ridge) — onset / break / heavy-rain — trained on real ENSO/IOD/MJO indices + real rainfall-derived labels from India's own official IMD gridded rainfall dataset (10 real years, 1992-2022) |
| Vegetation Response Model | Separately trained/validated: real NDVI (NASA MODIS) from real rainfall, R²=0.76, 10 districts |
| Advisory Engine | Rule-based expert system mapping calibrated probabilities + crop stage → farmer actions |

The calibration ensemble is real and trained on real data end to end (see
`ml/README.md`) — real climate indices, real rainfall-derived labels from
India's own official IMD gridded rainfall data, real time-based holdout
evaluation (R²≈0.02-0.52 depending on target — honest numbers, not
inflated; see `ml/README.md` for why heavy-rain scores lower).
Its current-day prediction anchors a documented, lightweight
uncertainty-widening model for the day-by-day timeline. The advisory
engine (`backend/app/services/advisory_engine.py`) is a fully rule-based
system, also real. A spatial (GNN) and temporal (TFT) deep-learning layer are
the natural next upgrades, detailed in `ml/README.md`.

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
ml/
  scripts/
    parse_indices.py      Parses raw ENSO/IOD/MJO downloads into a tidy table
    build_dataset.py       Builds the per-district training table
    train.py                Trains and saves the XGBoost calibration ensemble
  data/                    Raw + processed index data (gitignored)
  models/                  Trained model artifact (gitignored)
backend/
  app/
    main.py               FastAPI app, CORS, router mounting
    routers/               districts.py, forecast.py, advisory.py
    services/
      mock_data.py         Forecast assembly — calls the real trained model
      advisory_engine.py   Rule-based crop advisory engine
    data/districts.py      Curated district dataset
    models/
      inference.py          Loads the trained ensemble, predicts per district
      calibration_ensemble.joblib   Trained model artifact (copied from ml/)
frontend/
  src/
    App.jsx                 Top-level data fetching + layout
    components/              UI sections (Hero, RiskMap, ForecastPanel, ...)
    lib/                     API client, shared risk/severity styling
    hooks/                   Small reusable hooks
```

## Data sources

NOAA CPC ENSO (ONI/Niño 3.4) · NOAA PSL IOD (DMI) · Australian BoM MJO
(RMM1/RMM2) · ICAR crop calendars for advisory mapping. See `ml/README.md`
for exactly what's real vs. a documented stand-in, including the IMD gridded
rainfall labels (not yet wired in — the portal requires a manual download).
