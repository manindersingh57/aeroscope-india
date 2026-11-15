"""Run from backend directory after copying the five research data files."""
from app import create_app

app = create_app()
client = app.test_client()
for path in (
    "/api/v1/health",
    "/api/v1/ready",
    "/api/v1/overview",
    "/api/v1/location?lat=30.9010&lon=75.8573",
    "/api/v1/states/Punjab",
    "/api/v1/hotspots/model_b/summary",
):
    response = client.get(path)
    print(f"{response.status_code}  {path}")
    if response.status_code != 200:
        print(response.json)
        raise SystemExit(1)
print("Real-data smoke test passed.")
