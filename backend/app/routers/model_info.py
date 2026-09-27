from fastapi import APIRouter

from app.models.inference import get_feature_importance

router = APIRouter(prefix="/api/model", tags=["model"])


@router.get("/feature-importance")
def feature_importance():
    """Real, global feature importance per forecast target -- for the
    dashboard's 'why did the model predict this' panel. See
    inference.get_feature_importance for exactly what this is (and isn't)."""
    return {
        "targets": get_feature_importance(),
        "note": "Global feature importance averaged across XGBoost/Random Forest/"
        "Gradient Boosting sub-models (Ridge excluded -- linear coefficients "
        "aren't directly comparable). Not a per-prediction explanation.",
    }
