"""Map-specific routes for the future React/MapLibre frontend.

Source: saved notebook-derived hotspot engine; no new scientific calculations.
"""
from flask import Blueprint, current_app, jsonify, request

from ..map_metadata import MODEL_LEGENDS
from ..validation import integer_arg, number_arg, validate_model
from .api import get_service

maps_api = Blueprint("maps_api", __name__)


@maps_api.get("/layers")
def layers():
    """Map-layer selector, cluster legends and data-policy availability flags."""
    released = (current_app.config["ENVIRONMENT"] != "production"
                or current_app.config["PUBLIC_RESULTS_ENABLED"])
    return jsonify({
        "project": "AeroScope India",
        "temporal_scope": "historical",
        "data_is_live": False,
        "layers": {
            "model_a": MODEL_LEGENDS["model_a"],
            "model_b": MODEL_LEGENDS["model_b"],
        },
        "endpoints": {
            "hotspot_centers": "/api/v1/map/hotspots/{model}",
            "grid_points": "/api/v1/map/grid",
        },
        "availability": {
            "research_results": released,
            "grid_points": released and current_app.config["ENABLE_GRID_API"],
        },
        "geometry_notes": (
            "Hotspots are shown as center points; their bounding boxes are not exact region polygons."
        ),
        "disclaimer": "Historical satellite AOD is not live AQI or a pollution forecast.",
    })


@maps_api.get("/hotspots/<model>")
def hotspot_centers(model):
    """Return GeoJSON Point features for precomputed elevated-aerosol regions.

    This route is intentionally subject to the app's public-results policy.
    It does NOT disclose complete region polygons or raw GeoTIFFs.
    """
    model = validate_model(model)
    limit = integer_arg("limit", default=100, minimum=1, maximum=500)
    offset = integer_arg("offset", default=0, minimum=0)
    min_cells = integer_arg("min_cells", default=1, minimum=1, maximum=100000)
    min_aod = number_arg("min_mean_aod", minimum=0)
    state = (request.args.get("state") or "").strip() or None
    cluster_name = (request.args.get("cluster_name") or "").strip() or None
    regions = get_service().get_hotspots(
        model, state=state, cluster_name=cluster_name,
        min_cells=min_cells, min_mean_aod=min_aod,
    )
    page = regions[offset:offset + limit]
    features = []
    for record in page:
        center = record.get("center") or {}
        lat, lon = center.get("latitude"), center.get("longitude")
        if lat is None or lon is None:
            continue  # Missing coordinates cannot produce valid GeoJSON.
        props = {key: value for key, value in record.items() if key != "center"}
        # bounds is a rectangle around the reported region, NOT its actual polygon.
        features.append({
            "type": "Feature",
            "id": f"{model}:{record['region_id']}",
            "geometry": {"type": "Point", "coordinates": [float(lon), float(lat)]},
            "properties": props,
        })
    return jsonify({
        "type": "FeatureCollection",
        "features": features,
        "pagination": {
            "total": len(regions), "limit": limit, "offset": offset,
            "has_more": offset + limit < len(regions),
        },
        "geometry_type": "region_centers_only",
        "scientific_disclaimer": (
            "Historic aerosol clustering; hotspot points are region centers, not emission sources."
        ),
    })
