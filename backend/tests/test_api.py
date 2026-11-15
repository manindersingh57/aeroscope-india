from app import create_app


def test_health_and_readiness(client):
    assert client.get("/api/v1/health").json["status"] == "ok"
    assert client.get("/api/v1/ready").status_code == 200


def test_overview_dashboard(client):
    assert client.get("/api/v1/overview").json["total_grid_cells"] == 2
    assert client.get("/api/v1/dashboard").status_code == 200


def test_location_input_validation(client):
    response = client.get("/api/v1/location?lat=30.901&lon=75.857")
    assert response.status_code == 200
    assert response.json["profile"]["cell_id"] == 1
    for suffix in ["lat=91&lon=75", "lat=nan&lon=75", "lat=30", "lat=30&lon=75&max_distance_km=-1"]:
        assert client.get("/api/v1/location?" + suffix).status_code == 400


def test_states_and_comparison(client):
    assert client.get("/api/v1/states").json == ["Punjab", "Haryana"]
    assert client.get("/api/v1/states/Punjab").json["state"] == "Punjab"
    assert client.get("/api/v1/state-summaries").status_code == 200
    assert client.post("/api/v1/compare/states", json={"states": ["Punjab", "Haryana"]}).status_code == 200
    assert client.post("/api/v1/compare/states", json={"states": ["Punjab"]}).status_code == 400
    assert client.post("/api/v1/compare/states", json={"states": ["Punjab", "punjab"]}).status_code == 400
    assert client.post("/api/v1/compare/states", data="oops").status_code == 415


def test_hotspots(client):
    assert client.get("/api/v1/hotspots/model_a/summary").status_code == 200
    assert client.get("/api/v1/hotspots/model_a/largest?limit=1").status_code == 200
    r = client.get("/api/v1/hotspots/model_b?limit=1")
    assert r.status_code == 200 and r.json["total"] == 2 and len(r.json["items"]) == 1
    assert client.get("/api/v1/hotspots/model_a/435").status_code == 200
    assert client.get("/api/v1/hotspots/model_a/999").status_code == 404
    assert client.get("/api/v1/hotspots/model_z").status_code == 400
    assert client.get("/api/v1/hotspots/model_a?min_cells=0").status_code == 400


def test_grid_export_disabled_by_default(client):
    r = client.get("/api/v1/map/grid?south=20&north=40&west=70&east=90")
    assert r.status_code == 403
    assert r.json["error"]["code"] == "grid_export_disabled"


def test_data_missing_ready_503(tmp_path):
    app = create_app({"TESTING": True, "ANALYTICS_DIR": str(tmp_path)})
    c = app.test_client()
    assert c.get("/api/v1/health").status_code == 200
    assert c.get("/api/v1/ready").status_code == 503
    assert c.get("/api/v1/overview").status_code == 503


def test_cors_restricted(client):
    response = client.get("/api/v1/overview", headers={"Origin": "http://localhost:5173"})
    assert response.headers.get("Access-Control-Allow-Origin") == "http://localhost:5173"
    other = client.get("/api/v1/overview", headers={"Origin": "https://untrusted.example"})
    assert "Access-Control-Allow-Origin" not in other.headers


def test_unknown_endpoint_json_error(client):
    r = client.get("/api/v1/not-real")
    assert r.status_code == 404 and "error" in r.json
