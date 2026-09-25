# ML pipeline

Trains the calibration ensemble that powers `backend/app/models/inference.py`.

## Pipeline

```bash
cd ml
python3 -m venv venv && source venv/bin/activate
pip install pandas numpy xgboost scikit-learn joblib requests

python3 scripts/parse_indices.py         # -> data/climate_indices_monthly.csv (ENSO/IOD/MJO)
```

**Real rainfall — must be run on a normal (non-cloud/non-datacenter) network**,
since IMD's server blocks cloud IPs:
```bash
python3 scripts/download_imd_grid_LOCAL.py   # -> scripts/imd_district_rainfall.csv
python3 scripts/build_imd_grid_dataset.py    # -> data/imd_grid_training_table.csv
python3 scripts/train.py                     # -> models/calibration_ensemble.joblib
```

After training, copy the two files the backend needs:

```bash
cp models/calibration_ensemble.joblib ../backend/app/models/
cp data/climate_indices_monthly.csv ../backend/app/models/
```

(`build_dataset.py`/`training_table.csv` = earlier synthetic-label version;
`fetch_real_rainfall.py`/`build_real_dataset.py`/`real_training_table.csv`
= NASA POWER version. Both kept for reference/comparison, not used by
`train.py` anymore — `imd_grid_training_table.csv`, built from India's own
official IMD gridded data, is the current one.)

## What's real vs. a documented stand-in

**Real, end to end, as of the latest training run:**
- ENSO (ONI), IOD (DMI), and MJO (RMM) index values — NOAA CPC, NOAA PSL,
  Australian BoM
- Daily rainfall — **India's own official IMD 0.25° gridded rainfall
  dataset**, downloaded via `imdlib` (the purpose-built Python package for
  this exact IMD product) and extracted at each of 73/74 district
  centroids (Chennai's nearest grid cell falls over ocean/masked — the
  one gap). IMD's server blocks cloud/datacenter IPs (confirmed after
  trying the official portal, `imdlib`, and multiple mirrors from this
  environment), so this download has to be run from a normal residential/
  institutional connection — see `download_imd_grid_LOCAL.py`. Even from
  a normal connection the server is flaky (intermittent connection
  resets), so coverage is 10 real years rather than a continuous run:
  1992, 1993, 1996, 1998, 2004, 2007, 2009, 2011, 2014, 2022. Re-running
  the download script picks up more years over time as the server allows.
- Training *labels* (onset/break/heavy-rain rate per district-month) are
  derived directly from that real rainfall using standard, documented
  precipitation thresholds (see `build_imd_grid_dataset.py`):
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
  (train 1992-2011, test 2014-2022):

  | Target | R² | MAE |
  |---|---|---|
  | Onset | 0.48 | 0.157 |
  | Break | 0.52 | 0.154 |
  | Heavy rain | 0.02 | 0.016 |

  Onset/break improved over the NASA POWER version (0.41/0.38) — this is
  the actual official IMD measurement at each district's precise
  location, not a global reanalysis interpolation. Heavy-rain R² is
  honestly weak for the same reason as before: real extreme-rainfall days
  are rare, and monthly-aggregated climate indices alone don't carry much
  signal for single-day extremes — needs higher-frequency atmospheric
  features (see "Next upgrades"), not a better label definition.
- A separately trained, separately validated **vegetation-response model**
  (`train_vegetation.py`) predicts real NDVI (NASA MODIS) from real
  rainfall (NASA POWER) for 10 representative districts — R²=0.76. Not
  yet wired into the live app.

**Still a documented stand-in:**
- The day-by-day timeline in `mock_data.py` widens around the model's
  monthly-granularity base prediction rather than being a true per-day
  forecast — a real TFT quantile head is the natural next upgrade.
- MJO's *current* snapshot uses a climatological average amplitude/neutral
  phase rather than today's actual MJO state (BoM blocks scripted access
  to the live feed). Historical MJO values used in training are real (BoM
  data, fetched with a browser user-agent workaround).
- Only 10 of ~31 possible years (1992-2022) have real IMD rainfall due to
  the server's intermittent failures — re-running
  `download_imd_grid_LOCAL.py` a few more times will likely fill in more
  years without any code changes.

## Next upgrades, in order of value

1. Re-run `download_imd_grid_LOCAL.py` a few more times to catch more of
   the years that failed due to IMD server flakiness — free accuracy, no
   new code needed
2. Recover Chennai (TN-CHN) — nudge its extraction point slightly inland
   off the coastline so it lands on a valid (non-ocean) grid cell
3. Higher-frequency atmospheric features (ERA5 daily fields: moisture
   flux, wind shear) to actually move the heavy-rain R² — monthly index
   values alone don't carry enough signal for single-day extremes
4. Live MJO feed (BoM registered access, or an alternative mirror)
5. Per-day TFT quantile head instead of the monthly-anchored timeline
6. Spatial GNN over district adjacency (currently each district is
   predicted independently)
7. Extend the vegetation-response model to all 74 districts and wire its
   projection into the live forecast response
