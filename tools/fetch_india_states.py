"""Download openly licensed India ADM1 state boundaries into the Vite public folder.

Run ONCE from the project root: python tools/fetch_india_states.py

Boundary source: geoBoundaries gbOpen IND ADM1; underlying source DataMeet India,
license CC BY 2.5 India (verify current metadata), represented year 2011.
This is a reference overlay, not an official contemporary boundary product.
No INSAT-3D/MOSDAC satellite data is downloaded, embedded, or redistributed.
"""
from pathlib import Path
from urllib.request import Request, urlopen
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "frontend" / "public" / "data" / "india-states.geojson"
METADATA_URL = "https://www.geoboundaries.org/api/current/gbOpen/IND/ADM1/"


def load_json(url: str) -> dict:
    request = Request(url, headers={"User-Agent": "AeroScopeIndia-UniversityResearch/1.0"})
    with urlopen(request, timeout=120) as stream:
        return json.load(stream)


def main() -> None:
    print("Fetching state boundary metadata from geoBoundaries...")
    metadata = load_json(METADATA_URL)
    print("Source:", metadata.get("boundarySource"))
    print("License:", metadata.get("boundaryLicense"))
    print("Represented year:", metadata.get("boundaryYearRepresented"))
    url = metadata.get("simplifiedGeometryGeoJSON")
    if not isinstance(url, str) or not url.startswith("https://"):
        raise RuntimeError("geoBoundaries metadata did not include a simplified GeoJSON URL")
    print("Downloading open state boundaries...")
    geojson = load_json(url)
    if geojson.get("type") != "FeatureCollection" or not isinstance(geojson.get("features"), list):
        raise RuntimeError("Unexpected GeoJSON format")
    cleaned = []
    for feature in geojson["features"]:
        props = feature.get("properties", {})
        name = props.get("shapeName") or props.get("NAME_1")
        geometry = feature.get("geometry")
        if not name or not isinstance(geometry, dict) or geometry.get("type") not in {"Polygon", "MultiPolygon"}:
            continue
        cleaned.append({
            "type": "Feature",
            "properties": {"shapeName": name, "shapeISO": props.get("shapeISO")},
            "geometry": geometry,
        })
    if len(cleaned) < 25:
        raise RuntimeError(f"Only {len(cleaned)} state features found; refusing to save")
    DEST.parent.mkdir(parents=True, exist_ok=True)
    collection = {"type": "FeatureCollection", "features": cleaned}
    DEST.write_text(json.dumps(collection, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Saved {len(cleaned)} state/UT reference polygons to {DEST}")
    print(f"Size: {DEST.stat().st_size / (1024 * 1024):.2f} MiB")
    print("Attribution: geoBoundaries; original boundary source DataMeet India (CC BY 2.5 IN).")
    print("These boundaries are a historical, non-authoritative visual reference.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
