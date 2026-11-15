"""Import compact analytics exports from Colab without touching existing model data.

From backend/ in PowerShell:
    python -m scripts.import_analytics "$HOME\\Downloads\\aeroscope_analytics.zip"

Only six known files are copied, into backend/data/analytics/.
"""

import argparse
import shutil
from pathlib import Path
from zipfile import ZipFile, is_zipfile

BASE = Path(__file__).resolve().parents[1] / "data" / "analytics"
FILES = (
    "enhanced_kmeans_evaluation.csv",
    "final_model_a_profiles.csv",
    "final_model_b_profiles.csv",
    "alternative_clustering_comparison.csv",
    "final_robustness_summary.csv",
    "pca_cluster_summary.json",
)
MAX_BYTES = 5 * 1024 * 1024


def import_analytics(source: Path, overwrite=False):
    if not source.is_file() or not is_zipfile(source):
        raise ValueError("Expected a ZIP exported by Colab analytics export")
    with ZipFile(source) as archive:
        names = set(archive.namelist())
        resolved = {}
        for name in FILES:
            candidates = (f"aeroscope_analytics/{name}", name)
            found = next((key for key in candidates if key in names), None)
            if not found:
                raise FileNotFoundError(f"Missing required export: {name}")
            if archive.getinfo(found).file_size > MAX_BYTES:
                raise ValueError(f"Export too large: {name}")
            destination = BASE / name
            if destination.exists() and not overwrite:
                raise FileExistsError(f"{destination} already exists; use --overwrite to update")
            resolved[name] = found
        BASE.mkdir(parents=True, exist_ok=True)
        for name, archived in resolved.items():
            destination = BASE / name
            with archive.open(archived) as source_stream, destination.open("wb") as destination_stream:
                shutil.copyfileobj(source_stream, destination_stream)
            print("Imported:", destination.relative_to(BASE.parent.parent))
    print("Analytics import complete. Run pytest and restart Flask.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("zip_path", type=Path)
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()
    import_analytics(args.zip_path.expanduser().resolve(), overwrite=args.overwrite)
