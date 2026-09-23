"""
Train the calibration ensemble: one XGBoost regressor per target
(onset / break / heavy-rain probability) on real ENSO/IOD/MJO indices +
district geography. Trains on years <= 2015, holds out 2016-2025 for
evaluation (a genuine time-based split, not random shuffling).
"""

from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, r2_score
from xgboost import XGBRegressor

DATA = Path(__file__).resolve().parent.parent / "data"
MODELS = Path(__file__).resolve().parent.parent / "models"
MODELS.mkdir(exist_ok=True)

FEATURES = ["lat", "lon", "coastal", "dry_belt", "oni", "dmi", "mjo_amplitude", "mjo_phase", "month"]
TARGETS = {"onset": "onset_target", "break": "break_target", "heavy": "heavy_target"}


def main():
    df = pd.read_csv(DATA / "training_table.csv")

    train = df[df.year <= 2015]
    test = df[df.year > 2015]
    print(f"Train: {len(train)} rows ({train.year.min()}-{train.year.max()})")
    print(f"Test:  {len(test)} rows ({test.year.min()}-{test.year.max()})")

    models = {}
    for name, target_col in TARGETS.items():
        model = XGBRegressor(
            n_estimators=250,
            max_depth=4,
            learning_rate=0.05,
            subsample=0.85,
            colsample_bytree=0.85,
            reg_lambda=1.0,
            objective="reg:squarederror",
            random_state=42,
        )
        model.fit(train[FEATURES], train[target_col])

        preds = np.clip(model.predict(test[FEATURES]), 0, 1)
        mae = mean_absolute_error(test[target_col], preds)
        r2 = r2_score(test[target_col], preds)
        print(f"[{name}] MAE={mae:.4f}  R2={r2:.4f}")

        models[name] = model

    joblib.dump({"models": models, "features": FEATURES}, MODELS / "calibration_ensemble.joblib")
    print(f"Saved models to {MODELS / 'calibration_ensemble.joblib'}")


if __name__ == "__main__":
    main()
