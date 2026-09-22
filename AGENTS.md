# AGENTS.md

Guidance for AI coding agents (and humans) working in this repo.

## What this is

**Foresight** — Hyperlocal Monsoon Onset & Break Prediction System. SIH26086,
Ministry of Earth Sciences (NCMRWF). A hybrid DL/ML forecasting pipeline that turns
global climate teleconnections (ENSO/IOD/MJO) into 7-30 day block/district-level
monsoon onset, break, and heavy-rain probabilities, with a rule-based crop advisory
layer on top.

## Repo layout

```
backend/
  app/
    main.py               FastAPI app, CORS, router mounting
    routers/               districts.py, forecast.py, advisory.py — thin, no logic
    services/
      mock_data.py         MOCK forecast generator (stand-in for trained models)
      advisory_engine.py   REAL rule-based advisory engine (not mocked)
    data/districts.py      curated 74-district dataset (id, name, state, lat/lon, crop)
    models/                empty — trained model inference code goes here
  requirements.txt
  venv/                    already created, deps installed
frontend/
  src/
    App.jsx                 top-level data fetching + layout wiring
    components/              one component per section (Hero, RiskMap, ForecastPanel, etc.)
    lib/api.js               axios client, one function per backend endpoint
    lib/risk.js              shared risk-level / severity color + label maps
    hooks/useCountUp.js       small animation hook
    assets/india-districts.json  topojson (states only) for the map
README.md                  run instructions + tomorrow's model-wiring plan
```

## Commands

```bash
# Backend
cd backend && source venv/bin/activate && uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend && npm run dev      # http://localhost:5173, proxies /api -> :8000
cd frontend && npm run build    # production build sanity check
```

There are no automated tests yet. Treat a clean `npm run build` and a successful
`curl localhost:8000/api/health` as the minimum bar before calling a change done.

## Key architectural rule: mock/real boundary

`backend/app/services/mock_data.py` is the **only** place that fakes model output.
Its functions (`get_district_forecast`, `get_all_districts_snapshot`,
`get_national_summary`) return data in the exact shape real inference must return —
see the docstrings. Routers, the advisory engine, and the entire frontend consume
that shape and must not change when real models are wired in.

`backend/app/services/advisory_engine.py` is **real, not mocked** — it's a
deliberately rule-based expert system (not ML) that maps forecast probabilities +
crop stage to bilingual (EN/HI) advisories. Keep it rule-based; don't quietly turn
it into a model call.

When wiring in trained models, add `backend/app/models/*.py` (teleconnection
encoder, spatial downscaling GNN, temporal forecast head, calibration ensemble) and
swap the *implementation* of the `mock_data.py` functions to call them — keep the
function names/signatures/return shape stable so nothing downstream needs to change.

## Conventions

- Frontend: React + Vite + Tailwind v4 (CSS-first `@theme` config in `index.css`,
  no `tailwind.config.js`). Framer Motion for all animation. Dark-only design (no
  light theme toggle exists — don't add one unless asked).
- Design tokens live in `frontend/src/index.css` under `@theme` (colors: `ink`,
  `surface`, `monsoon`, `amber`, `rose`, etc.) and in `frontend/src/lib/risk.js`
  (risk-level and severity color/label maps). Reuse these, don't hardcode new colors.
- Backend: FastAPI, plain functions in `services/`, routers stay thin (fetch +
  shape response, no business logic inline).
- No database — everything is either curated static data (`data/districts.py`) or
  computed on request. Don't add a DB/ORM unless explicitly asked.

## Known gaps / not yet wired

- Real trained models (teleconnection encoder, GNN, TFT, calibration ensemble) —
  `backend/app/models/` is currently empty
- Deployment config for Render/Vercel (backend start command, frontend env-based
  API URL — the frontend currently relies on the Vite dev proxy for `/api`, which
  does not exist in a production build)
- Production CORS restricted to the deployed frontend origin (currently `*`)
- Real WhatsApp/SMS gateway integration (currently UI-only)
- District adjacency graph data for the spatial GNN
- Automated tests
