import pytest
from app import create_app


class FakeService:
    def get_overview(self):
        return {"project": "AeroScope India", "total_grid_cells": 2}
    def get_dashboard(self):
        return {"coverage": {"model_a_cells": 1}}
    def get_location(self, latitude, longitude, max_distance_km=None):
        return {"status": "success", "query": {"latitude": latitude, "longitude": longitude}, "profile": {"cell_id": 1}}
    def list_states(self):
        return ["Punjab", "Haryana"]
    def get_state_summaries(self):
        return [{"state": "Punjab"}]
    def get_state(self, name):
        if name.lower() != "punjab":
            raise ValueError("State not found")
        return {"state": "Punjab"}
    def compare_states(self, names):
        return {"states": names}
    def get_hotspot_summary(self, model):
        return {"model": model, "qualifying_regions": 1}
    def get_largest_hotspots(self, model, limit):
        return [{"region_id": 435}][:limit]
    def get_hotspots(self, model, **kwargs):
        return [{"region_id": 435, "model": model}, {"region_id": 436, "model": model}]
    def get_hotspot(self, model, region_id):
        return {"region_id": region_id} if region_id == 435 else None


@pytest.fixture
def client():
    app = create_app({"TESTING": True, "ENVIRONMENT": "development", "ALLOWED_ORIGINS": ["http://localhost:5173"]}, service=FakeService())
    return app.test_client()
