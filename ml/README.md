# ML pipeline

Trains the calibration ensemble that powers `backend/app/models/inference.py`.

## Pipeline

```bash
cd ml
python3 -m venv venv && source venv/bin/activate
pip install pandas numpy xgboost scikit-learn joblib requests

python3 scripts/parse_indices.py      # -> data/climate_indices_monthly.csv (ENSO/IOD/MJO)
python3 scripts/fetch_real_rainfall.py # -> data/real_rainfall.json (real daily rainfall, all 74 districts)
python3 scripts/build_real_dataset.py  # -> data/real_training_table.csv (real rainfall-derived labels)
python3 scripts/train.py               # -> models/calibration_ensemble.joblib
```

After training, copy the two files the backend needs:

```bash
cp models/calibration_ensemble.joblib ../backend/app/models/
cp data/climate_indices_monthly.csv ../backend/app/models/
```

(`scripts/build_dataset.py` / `data/training_table.csv` are the earlier
synthetic-label version, kept for reference/comparison — not used by
`train.py` anymore.)

## What's real vs. a documented stand-in

**Real, end to end, as of the latest training run:**
- ENSO (ONI), IOD (DMI), and MJO (RMM) index values — pulled from NOAA CPC,
  NOAA PSL, and the Australian Bureau of Meteorology
- Daily rainfall for all 74 districts, 1981-2023 — pulled from NASA POWER
  (`fetch_real_rainfall.py`), a free no-auth reanalysis-based precipitation
  API. This replaced the earlier synthetic-label approach: IMD's own
  gridded rainfall portal is a manual form-submission download with no
  scriptable bulk endpoint, so NASA POWER is the real substitute.
- Training *labels* (onset/break/heavy-rain rate per district-month) are
  now derived directly from that real rainfall using standard, documented
  precipitation thresholds (see `build_real_dataset.py`):
  - **break**: fraction of days where trailing 7-day rainfall < 15mm (a
    dry-spell/deficit proxy)
  - **onset**: fraction of days where trailing 7-day rainfall ≥ 35mm (an
    active/well-established-monsoon proxy)
  - **heavy**: fraction of days with single-day rainfall ≥ 64.5mm — IMD's
    own official "heavy rainfall" classification threshold
  
  These are real, disclosed threshold choices (not IMD's full multi-signal
  operational algorithm, which also needs wind/OLR fields we don't have),
  not a fitted formula chosen to hit a target score.
- The trained 4-model ensemble (XGBoost + Random Forest + Gradient
  Boosting + Ridge per target), evaluated on a genuine time-based holdout
  (train 1981-2015, test 2016-2023):

  | Target | R² | MAE |
  |---|---|---|
  | Onset | 0.41 | 0.197 |
  | Break | 0.38 | 0.172 |
  | Heavy rain | 0.06 | 0.009 |

  Onset/break sit close to where published ENSO-monsoon skill research
  typically lands (real-world seasonal forecasting skill is usually
  R²≈0.1-0.3). Heavy-rain R² is honestly weak — real extreme-rainfall days
  are rare (~0.6% of days), and monthly-aggregated climate indices alone
  don't carry much signal for single-day extremes; a real improvement here
  needs higher-frequency atmospheric features (see "Next upgrades" below),
  not a better label definition.
- A separately trained, separately validated **vegetation-response model**
  (`train_vegetation.py`) predicts real NDVI (NASA MODIS) from real
  rainfall (NASA POWER) for 10 representative districts — R²=0.76. Both
  sides of this one are real observations, so its score means something
  checkable in a way the main ensemble's earlier synthetic-label version
  didn't. Not yet wired into the live app (see project status).

**Still a documented stand-in:**
- The day-by-day timeline in `mock_data.py` widens around the model's
  monthly-granularity base prediction rather than being a true per-day
  forecast — a real TFT quantile head is the natural next upgrade.
- MJO's *current* snapshot uses a climatological average amplitude/neutral
  phase rather than today's actual MJO state (BoM blocks scripted access
  to the live feed). Historical MJO values used in training are real (BoM
  data, fetched with a browser user-agent workaround).

## Next upgrades, in order of value

1. Higher-frequency atmospheric features (ERA5 daily fields: moisture
   flux, wind shear) to actually move the heavy-rain R² — monthly index
   values alone don't carry enough signal for single-day extremes
2. Live MJO feed (BoM registered access, or an alternative mirror)
3. Per-day TFT quantile head instead of the monthly-anchored timeline
4. Spatial GNN over district adjacency (currently each district is
   predicted independently)
5. Extend the vegetation-response model to all 74 districts and wire its
   projection into the live forecast response
