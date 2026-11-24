"""Read-only analytical endpoints for React charts and scientific reporting."""

from flask import Blueprint, current_app, jsonify

from ..analytics_store import AnalyticsStore
from ..validation import validate_model

analytics_api = Blueprint("analytics_api", __name__)


def get_store():
    return AnalyticsStore(current_app.config["ANALYTICS_DIR"])


@analytics_api.get("/analytics-status")
def analytics_status():
    """Readiness inventory; reveals no scientific measurements."""
    return jsonify(get_store().status())


@analytics_api.get("/<model>/metrics")
def metrics(model):
    return jsonify(get_store().evaluation(validate_model(model)))


@analytics_api.get("/<model>/profiles")
def profiles(model):
    return jsonify(get_store().profiles(validate_model(model)))


@analytics_api.get("/<model>/comparisons")
def comparisons(model):
    return jsonify(get_store().comparison(validate_model(model)))


@analytics_api.get("/<model>/robustness")
def robustness(model):
    return jsonify(get_store().robustness(validate_model(model)))


@analytics_api.get("/<model>/pca")
def pca(model):
    return jsonify(get_store().pca(validate_model(model)))


@analytics_api.get("/<model>/pca-points")
def cluster_pca_points(model):
    # Read saved PCA scatterpoints, respecting the existing public research policy.
    from ..errors import APIError
    from ..pca_scatter import load_pca_scatter
    model = validate_model(model)
    if (current_app.config.get("ENVIRONMENT") == "production" and
            not current_app.config.get("PUBLIC_RESULTS_ENABLED", False)):
        raise APIError("Public research results are disabled", 403, "public_results_disabled")
    return jsonify(load_pca_scatter(current_app.config["ANALYTICS_DIR"], model))


@analytics_api.get("/study-revision")
def updated_study_revision():
    """Latest LOCAL verified model metadata, not raw research rows."""
    import json
    from pathlib import Path
    from ..errors import APIError
    if (current_app.config.get("ENVIRONMENT") == "production"
            and not current_app.config.get("PUBLIC_RESULTS_ENABLED", False)):
        raise APIError("Public research results are disabled", 403, "public_results_disabled")
    path = Path(current_app.config["ANALYTICS_DIR"]) / "data" / "model_revision.json"
    if not path.is_file():
        raise APIError("Updated research exports not synchronized", 503, "analytics_unavailable")
    with path.open(encoding="utf-8") as handle:
        payload = json.load(handle)
    if payload.get("schema") != "aeroscope-model-revision-v1":
        raise APIError("Model revision metadata invalid", 503, "analytics_invalid")
    return jsonify(payload)
