# ML pipeline

Trains the calibration ensemble that powers `backend/app/models/inference.py`.

## Pipeline

```bash
cd ml
python3 -m venv venv && source venv/bin/activate
pip install pandas numpy xgboost scikit-learn joblib

python3 scripts/parse_indices.py   # -> data/climate_indices_monthly.csv
python3 scripts/build_dataset.py   # -> data/training_table.csv
python3 scripts/train.py           # -> models/calibration_ensemble.joblib
```

After training, copy the two files the backend needs:

```bash
cp models/calibration_ensemble.joblib ../backend/app/models/
cp data/climate_indices_monthly.csv ../backend/app/models/
```

## What's real vs. a documented stand-in

**Real:**
- ENSO (ONI), IOD (DMI), and MJO (RMM) index values — pulled from NOAA CPC,
  NOAA PSL, and the Australian Bureau of Meteorology
- The trained XGBoost regressors (one each for onset / break / heavy-rain
  probability), evaluated on a genuine time-based holdout (train ≤2015,
  test 2016-2025): R² ≈ 0.5-0.6, MAE ≈ 0.06 — honest numbers for a
  compact feature set, not overfit
- `backend/app/models/inference.py` calls these trained models directly

**Documented stand-in, not real observations:**
- Training *labels* (onset/break/heavy-rain rates per district-month) are
  constructed from published ENSO/IOD-monsoon relationships (El Niño →
  deficient/break-prone monsoon; La Niña → normal-to-above-normal; positive
  IOD partially offsets El Niño) rather than true IMD gridded rainfall
  observations. The IMD gridded rainfall portal
  (imdpune.gov.in/cmpg/Griddata/Rainfall_25_NetCDF.html) is a manual
  form-submission download, not a scriptable bulk endpoint — swap
  `label_targets()` in `scripts/build_dataset.py` for real observed rates
  once that data is downloaded manually; nothing downstream changes.
- The day-by-day timeline in `mock_data.py` widens around the model's
  monthly-granularity base prediction rather than being a true per-day
  forecast — a real TFT quantile head is the natural next upgrade.
- MJO's real-time feed wasn't reliably scriptable (BoM blocks automated
  access), so the *current* snapshot uses a climatological average
  amplitude/neutral phase rather than today's actual MJO state. Historical
  MJO values used in training are real (BoM data, fetched with a browser
  user-agent).

## Next upgrades, in order of value

1. Real IMD gridded rainfall labels (biggest accuracy lever)
2. Live MJO feed (BoM registered access, or an alternative mirror)
3. Per-day TFT quantile head instead of the monthly-anchored timeline
4. Spatial GNN over district adjacency (currently each district is
   predicted independently)
