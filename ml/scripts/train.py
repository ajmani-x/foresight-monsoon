"""
Train the calibration ensemble: for each target (onset / break / heavy-rain
probability) a 4-model ensemble — XGBoost, Random Forest, Gradient Boosting,
and Ridge — averaged via sklearn's VotingRegressor. Mixing tree-boosting,
bagging, another boosting variant, and a linear model gives genuinely
diverse error patterns (not just 4 near-identical trees), which is what
actually reduces variance in an ensemble rather than just adding compute.

Trains on real_training_table.csv (see build_real_dataset.py) — labels
derived from REAL observed rainfall (NASA POWER), not the earlier
synthetic ENSO/IOD-formula version (training_table.csv, kept for
reference/comparison). Trains on years <= 2015, holds out 2016-2023 for
evaluation (a genuine time-based split, not random shuffling).
"""

from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor, VotingRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, r2_score
from xgboost import XGBRegressor

DATA = Path(__file__).resolve().parent.parent / "data"
MODELS = Path(__file__).resolve().parent.parent / "models"
MODELS.mkdir(exist_ok=True)

FEATURES = ["lat", "lon", "coastal", "dry_belt", "oni", "dmi", "mjo_amplitude", "mjo_phase", "month"]
TARGETS = {"onset": "onset_target", "break": "break_target", "heavy": "heavy_target"}


def make_ensemble():
    xgb = XGBRegressor(
        n_estimators=250, max_depth=4, learning_rate=0.05,
        subsample=0.85, colsample_bytree=0.85, reg_lambda=1.0,
        objective="reg:squarederror", random_state=42,
    )
    rf = RandomForestRegressor(
        n_estimators=300, max_depth=8, min_samples_leaf=5, random_state=42, n_jobs=-1,
    )
    gbr = GradientBoostingRegressor(
        n_estimators=200, max_depth=3, learning_rate=0.05, subsample=0.85, random_state=42,
    )
    ridge = Ridge(alpha=1.0)

    return VotingRegressor(
        estimators=[("xgb", xgb), ("rf", rf), ("gbr", gbr), ("ridge", ridge)],
        weights=[0.35, 0.3, 0.25, 0.1],  # tilt toward the stronger tree models, linear as a stabilizer
    )


def main():
    df = pd.read_csv(DATA / "FINAL_TRAINING_DATASET.csv")

    train = df[df.year <= 2014]
    test = df[df.year > 2014]
    print(f"Train: {len(train)} rows ({train.year.min()}-{train.year.max()})")
    print(f"Test:  {len(test)} rows ({test.year.min()}-{test.year.max()})")

    models = {}
    for name, target_col in TARGETS.items():
        ensemble = make_ensemble()
        ensemble.fit(train[FEATURES], train[target_col])

        preds = np.clip(ensemble.predict(test[FEATURES]), 0, 1)
        mae = mean_absolute_error(test[target_col], preds)
        r2 = r2_score(test[target_col], preds)
        print(f"[{name}] ensemble  MAE={mae:.4f}  R2={r2:.4f}")

        # per-submodel breakdown, for the pitch and for sanity-checking the ensemble is pulling its weight
        for sub_name, sub_model in ensemble.named_estimators_.items():
            sub_preds = np.clip(sub_model.predict(test[FEATURES]), 0, 1)
            sub_r2 = r2_score(test[target_col], sub_preds)
            print(f"    - {sub_name:6s} R2={sub_r2:.4f}")

        models[name] = ensemble

    joblib.dump({"models": models, "features": FEATURES}, MODELS / "calibration_ensemble.joblib")
    print(f"Saved models to {MODELS / 'calibration_ensemble.joblib'}")


if __name__ == "__main__":
    main()
