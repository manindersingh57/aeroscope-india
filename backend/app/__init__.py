"""AeroScope India Flask application factory."""
import json
import os
from pathlib import Path

from flask import Flask, request
from flask_cors import CORS

from .errors import register_error_handlers

REQUIRED_FILES = (
    "data/india_grid_features.parquet",
    "data/dashboard_summary.json",
    "config/backend_config.json",
    "data/hotspots/model_a_elevated_regions.csv",
    "data/hotspots/model_b_elevated_regions.csv",
)


def create_app(test_config=None, service=None):
    # The analytical engine expects its data/ and config/ below the same folder.
    backend_root = Path(__file__).resolve().parents[1]
    app = Flask(__name__)
    app.json.ensure_ascii = False

    origins_raw = os.getenv("AEROSCOPE_ALLOWED_ORIGINS", "http://localhost:5173")
    origins = [s.strip().rstrip("/") for s in origins_raw.split(",") if s.strip()]
    environment = os.getenv("AEROSCOPE_ENV", "development").lower()
    app.config.update(
        ENVIRONMENT=environment,
        ANALYTICS_DIR=str(Path(os.getenv("AEROSCOPE_PACKAGE_DIR", str(backend_root))).resolve()),
        ALLOWED_ORIGINS=origins,
        ENABLE_GRID_API=os.getenv("AEROSCOPE_ENABLE_GRID_API", "false").lower() == "true",
        PUBLIC_RESULTS_ENABLED=os.getenv("AEROSCOPE_PUBLIC_RESULTS_ENABLED", "false").lower() == "true",
        MAX_CONTENT_LENGTH=32 * 1024,
    )
    if test_config:
        app.config.update(test_config)

    if "*" in app.config["ALLOWED_ORIGINS"]:
        raise ValueError("Wildcard CORS origin is forbidden")
    if app.config["ENVIRONMENT"] == "production" and any(
        not origin.startswith("https://") for origin in app.config["ALLOWED_ORIGINS"]
    ):
        raise ValueError("Production CORS origins must use https")

    CORS(app, resources={r"/api/*": {"origins": app.config["ALLOWED_ORIGINS"]}},
         supports_credentials=False, methods=["GET", "POST", "OPTIONS"])

    app.extensions["aeroscope_service"] = service
    app.extensions["aeroscope_load_error"] = None

    if service is None:
        data_root = Path(app.config["ANALYTICS_DIR"])
        missing = [name for name in REQUIRED_FILES if not (data_root / name).is_file()]
        if missing:
            app.extensions["aeroscope_load_error"] = "Required data files not installed"
            app.logger.warning("Analytical data not installed: %s", ", ".join(missing))
        else:
            try:
                from .engines.aeroscope_service import AeroScopeService
                app.extensions["aeroscope_service"] = AeroScopeService(data_root)
            except (OSError, ValueError, KeyError, ImportError) as err:
                app.extensions["aeroscope_load_error"] = type(err).__name__
                app.logger.exception("Failed loading analytical service")

    # Fail closed for all research-result endpoints on public hosting until
    # redistribution permissions have been reviewed and explicitly approved.
    @app.before_request
    def enforce_public_results_policy():
        if request.method == "OPTIONS":
            return None  # Preserve CORS preflight handling.
        if app.config["ENVIRONMENT"] != "production" or app.config["PUBLIC_RESULTS_ENABLED"]:
            return None
        protected = (
            "/api/v1/overview", "/api/v1/dashboard", "/api/v1/location",
            "/api/v1/states", "/api/v1/state-summaries", "/api/v1/compare/states",
            "/api/v1/hotspots", "/api/v1/map/grid", "/api/v1/map/hotspots",
        )
        path = request.path.rstrip("/")
        if any(path == prefix or path.startswith(prefix + "/") for prefix in protected):
            from .errors import APIError
            raise APIError(
                "Public research results are disabled pending data-policy review",
                403,
                "public_results_disabled",
            )
        return None

    register_error_handlers(app)
    from .routes.api import api
    app.register_blueprint(api, url_prefix="/api/v1")
    from .routes.maps import maps_api
    app.register_blueprint(maps_api, url_prefix="/api/v1/map")
    return app
