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
