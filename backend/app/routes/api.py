"""JSON routes for the React frontend. Scientific calculations are in engines."""
import json
from pathlib import Path

from flask import Blueprint, current_app, jsonify, request, send_file

from ..errors import APIError
from ..validation import integer_arg, number_arg, validate_model

api = Blueprint("api", __name__)


def get_service():
    service = current_app.extensions.get("aeroscope_service")
    if service is None:
        raise APIError("Research data not installed or not ready", 503, "service_unavailable")
    return service


@api.get("/health")
def health():
    return jsonify({"status": "ok", "service": "AeroScope India Flask API", "api_version": "v1"})


@api.get("/ready")
def ready():
    if current_app.extensions.get("aeroscope_service") is None:
        raise APIError("Research data not installed or not ready", 503, "service_unavailable")
    return jsonify({"status": "ready", "research_data_loaded": True})


@api.get("/capabilities")
def capabilities():
    """Read-only availability information; does not reveal research measurements."""
    released = (current_app.config["ENVIRONMENT"] != "production"
                or current_app.config["PUBLIC_RESULTS_ENABLED"])
    return jsonify({
        "api_version": "v1",
        "research_data_loaded": current_app.extensions.get("aeroscope_service") is not None,
        "research_results_available": released,
        "grid_points_available": released and current_app.config["ENABLE_GRID_API"],
        "historical_data_only": True,
        "documentation": "/api/v1/openapi.json",
    })



@api.get("/openapi.json")
def openapi():
    """Machine-readable OpenAPI contract for the React frontend."""
    spec = Path(__file__).resolve().parents[2] / "docs" / "openapi.json"

    return current_app.response_class(
        spec.read_bytes(),
        mimetype="application/json"
    )



@api.get("/overview")
def overview():
    return jsonify(get_service().get_overview())


@api.get("/dashboard")
def dashboard():
    return jsonify(get_service().get_dashboard())


@api.get("/location")
def location():
    lat = number_arg("lat", required=True, minimum=-90, maximum=90)
    lon = number_arg("lon", required=True, minimum=-180, maximum=180)
    radius = number_arg("max_distance_km", minimum=0.000001, maximum=100)
    result = get_service().get_location(lat, lon, max_distance_km=radius)
    return jsonify(result)


@api.get("/states")
def states():
    return jsonify(get_service().list_states())


@api.get("/state-summaries")
def state_summaries():
    return jsonify(get_service().get_state_summaries())


@api.get("/states/<path:state_name>")
def state_profile(state_name):
    return jsonify(get_service().get_state(state_name))


@api.post("/compare/states")
def compare_states():
    if not request.is_json:
        raise APIError("Content-Type must be application/json", 415, "unsupported_media_type")
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or not isinstance(data.get("states"), list):
        raise APIError('JSON object with a "states" list is required')
    names = data["states"]
    if not (2 <= len(names) <= 10) or any(
        not isinstance(x, str) or not x.strip() or len(x) > 120 for x in names
    ):
        raise APIError("states must contain 2 to 10 nonempty names")
    if len({x.strip().casefold() for x in names}) != len(names):
        raise APIError("states must not contain duplicates")
    return jsonify(get_service().compare_states([x.strip() for x in names]))


@api.get("/hotspots/<model>/summary")
def hotspot_summary(model):
    return jsonify(get_service().get_hotspot_summary(validate_model(model)))


@api.get("/hotspots/<model>/largest")
def hotspots_largest(model):
    validate_model(model)
    limit = integer_arg("limit", default=10, minimum=1, maximum=100)
    return jsonify(get_service().get_largest_hotspots(model, limit))


@api.get("/hotspots/<model>/<int:region_id>")
def hotspot_detail(model, region_id):
    validate_model(model)
    result = get_service().get_hotspot(model, region_id)
    if result is None:
        raise APIError("Hotspot region not found", 404, "not_found")
    return jsonify(result)


@api.get("/hotspots/<model>")
def hotspot_list(model):
    validate_model(model)
    min_cells = integer_arg("min_cells", default=1, minimum=1, maximum=100000)
    min_aod = number_arg("min_mean_aod", minimum=0)
    limit = integer_arg("limit", default=50, minimum=1, maximum=500)
    offset = integer_arg("offset", default=0, minimum=0)
    regions = get_service().get_hotspots(
        model, state=request.args.get("state") or None,
        cluster_name=request.args.get("cluster_name") or None,
        min_cells=min_cells, min_mean_aod=min_aod,
    )
    return jsonify({"items": regions[offset:offset + limit], "total": len(regions),
                    "limit": limit, "offset": offset})


@api.get("/models")
def models():
    get_service()
    path = Path(current_app.config["ANALYTICS_DIR"]) / "config" / "backend_config.json"
    if not path.is_file():
        raise APIError("Model metadata is unavailable", 503, "service_unavailable")
    with path.open(encoding="utf-8") as f:
        config = json.load(f)
    return jsonify({
        "source": config.get("data_source"),
        "observation_period": config.get("observation_period"),
        "models": config.get("models"),
        "scientific_limitations": config.get("scientific_limitations", []),
    })


@api.get("/map/grid")
def map_grid():
    """Optional GeoJSON grid subset, disabled by default pending data-policy review."""
    if not current_app.config["ENABLE_GRID_API"]:
        raise APIError("Grid export is disabled pending data policy review", 403, "grid_export_disabled")
    south = number_arg("south", required=True, minimum=-90, maximum=90)
    north = number_arg("north", required=True, minimum=-90, maximum=90)
    west = number_arg("west", required=True, minimum=-180, maximum=180)
    east = number_arg("east", required=True, minimum=-180, maximum=180)
    if south > north or west > east:
        raise APIError("Bounds must satisfy south <= north and west <= east")
    limit = integer_arg("limit", default=500, minimum=1, maximum=2000)
    offset = integer_arg("offset", default=0, minimum=0)
    model = request.args.get("model", "all")
    if model not in ("all", "model_a", "model_b"):
        raise APIError("model must be all, model_a, or model_b")
    engine = get_service().location_engine
    frame = engine.df
    mask = frame["latitude"].between(south, north) & frame["longitude"].between(west, east)
    if model != "all":
        mask &= frame[model + "_available"].astype("string").str.strip().str.lower().isin(["true", "1"])
    filtered = frame.loc[mask]
    page = filtered.iloc[offset:offset + limit]
    fields = ["cell_id", "state_name", "mean_aod", "valid_days", "model_a_cluster_name", "model_b_cluster_name"]
    features = []
    for _, row in page.iterrows():
        props = {f: engine.clean(row.get(f)) for f in fields}
        features.append({"type": "Feature", "geometry": {
            "type": "Point", "coordinates": [float(row["longitude"]), float(row["latitude"])]},
            "properties": props})
    return jsonify({"type": "FeatureCollection", "features": features,
                    "pagination": {"total": int(len(filtered)), "offset": offset,
                                   "limit": limit, "has_more": offset + limit < len(filtered)}})
