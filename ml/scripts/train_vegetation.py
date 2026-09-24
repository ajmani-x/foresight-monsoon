"""
Train a rainfall -> NDVI (vegetation response) regression on REAL observed
data (both sides: NASA MODIS NDVI and NASA POWER rainfall). Unlike the main
calibration ensemble, this R^2 is a real, checkable number -- no synthetic
labels involved anywhere in this one.

Time-based holdout: train on dates before 2022-07-01, test on dates after.
"""

from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, r2_score

DATA = Path(__file__).resolve().parent.parent / "data"
MODELS = Path(__file__).resolve().parent.parent / "models"
MODELS.mkdir(exist_ok=True)

FEATURES = ["lat", "lon", "month", "rain_15d", "rain_30d"]
SPLIT_DATE = "2022-07-01"


def main():
    df = pd.read_csv(DATA / "vegetation_table.csv")
    train = df[df.date < SPLIT_DATE]
    test = df[df.date >= SPLIT_DATE]
    print(f"Train: {len(train)} rows (< {SPLIT_DATE})")
    print(f"Test:  {len(test)} rows (>= {SPLIT_DATE})")

    candidates = {
        "ridge": Ridge(alpha=1.0),
        "rf": RandomForestRegressor(n_estimators=200, max_depth=6, min_samples_leaf=4, random_state=42),
        "gbr": GradientBoostingRegressor(n_estimators=150, max_depth=3, learning_rate=0.05, random_state=42),
    }

    best_name, best_model, best_r2 = None, None, -np.inf
    for name, model in candidates.items():
        model.fit(train[FEATURES], train["ndvi"])
        preds = model.predict(test[FEATURES])
        mae = mean_absolute_error(test["ndvi"], preds)
        r2 = r2_score(test["ndvi"], preds)
        print(f"[{name}] MAE={mae:.4f}  R2={r2:.4f}")
        if r2 > best_r2:
            best_name, best_model, best_r2 = name, model, r2

    print(f"\nBest: {best_name} (R2={best_r2:.4f}) -- saving.")
    joblib.dump({"model": best_model, "features": FEATURES, "name": best_name}, MODELS / "vegetation_model.joblib")


if __name__ == "__main__":
    main()
