from app import create_app
from conftest import FakeService


def test_layer_metadata_is_available_without_dataset(tmp_path):
    app = create_app({"TESTING": True, "ANALYTICS_DIR": str(tmp_path)}, service=None)
    response = app.test_client().get("/api/v1/map/layers")
    assert response.status_code == 200
    models = response.json["layers"]
    assert len(models["model_a"]["clusters"]) == 4
    assert len(models["model_b"]["clusters"]) == 5
    assert models["model_a"]["clusters"][0]["name"] == "Lower Aerosol Loading"
    assert response.json["data_is_live"] is False


def test_hotspot_centers_geojson(client):
    response = client.get("/api/v1/map/hotspots/model_a?limit=1")
    assert response.status_code == 200
    assert response.json["type"] == "FeatureCollection"
    assert response.json["pagination"]["total"] == 2
    assert response.json["pagination"]["has_more"] is True
    feature = response.json["features"][0]
    assert feature["geometry"] == {"type": "Point", "coordinates": [75.9, 30.9]}
    assert feature["properties"]["region_id"] == 435
    assert "center" not in feature["properties"]


def test_hotspot_map_invalid_model_and_pagination(client):
    assert client.get("/api/v1/map/hotspots/invalid").status_code == 400
    assert client.get("/api/v1/map/hotspots/model_a?limit=0").status_code == 400
    assert client.get("/api/v1/map/hotspots/model_a?offset=-1").status_code == 400


def test_production_data_policy_blocks_research_results():
    app = create_app({
        "TESTING": True,
        "ENVIRONMENT": "production",
        "PUBLIC_RESULTS_ENABLED": False,
        "ALLOWED_ORIGINS": ["https://aeroscope.example"],
    }, service=FakeService())
    client = app.test_client()
    assert client.get("/api/v1/health").status_code == 200
    assert client.get("/api/v1/map/layers").status_code == 200
    for path in (
        "/api/v1/location?lat=30.901&lon=75.857",
        "/api/v1/overview", "/api/v1/dashboard", "/api/v1/states/Punjab",
        "/api/v1/hotspots/model_a", "/api/v1/map/hotspots/model_a",
        "/api/v1/map/grid?south=20&north=40&west=70&east=90",
    ):
        response = client.get(path)
        assert response.status_code == 403, (path, response.json)
        assert response.json["error"]["code"] == "public_results_disabled"
    assert client.get("/api/v1/map/layers").json["availability"]["research_results"] is False


def test_production_results_can_be_enabled_explicitly():
    app = create_app({
        "TESTING": True,
        "ENVIRONMENT": "production",
        "PUBLIC_RESULTS_ENABLED": True,
        "ALLOWED_ORIGINS": ["https://aeroscope.example"],
    }, service=FakeService())
    c = app.test_client()
    assert c.get("/api/v1/overview").status_code == 200
    assert c.get("/api/v1/map/hotspots/model_a").status_code == 200
    # The separate grid permission remains disabled.
    assert c.get("/api/v1/map/grid?south=20&north=40&west=70&east=90").status_code == 403
