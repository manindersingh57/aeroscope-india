"""Import the 5 real data/config files from your Phase 29A portable package.

Run from the backend folder:
    python scripts/import_research_data.py /path/to/aeroscope_backend.zip
or:
    python scripts/import_research_data.py /path/to/aeroscope_backend

No model training or raw-data processing occurs here.
"""
from pathlib import Path
import argparse
import shutil
import zipfile

ROOT = Path(__file__).resolve().parents[1]
FILES = (
    "data/india_grid_features.parquet",
    "data/dashboard_summary.json",
    "data/hotspots/model_a_elevated_regions.csv",
    "data/hotspots/model_b_elevated_regions.csv",
    "config/backend_config.json",
)


def import_from_directory(src: Path, overwrite: bool):
    # ZIP package typically contains an aeroscope_backend/ root.
    if (src / "aeroscope_backend").is_dir():
        src = src / "aeroscope_backend"
    missing = [p for p in FILES if not (src / p).is_file()]
    if missing:
        raise FileNotFoundError(f"Source package missing: {', '.join(missing)}")
    for rel in FILES:
        target = ROOT / rel
        if target.exists() and not overwrite:
            raise FileExistsError(f"{target} already exists; use --overwrite only if intentional")
    for rel in FILES:
        target = ROOT / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src / rel, target)
        print("Copied:", rel)


def import_from_zip(src: Path, overwrite: bool):
    with zipfile.ZipFile(src) as archive:
        lookup = {}
        for rel in FILES:
            candidates = [rel, "aeroscope_backend/" + rel]
            match = next((n for n in candidates if n in archive.namelist()), None)
            if not match:
                raise FileNotFoundError(f"Archive missing {rel}")
            lookup[rel] = match
        for rel in FILES:
            target = ROOT / rel
            if target.exists() and not overwrite:
                raise FileExistsError(f"{target} already exists; use --overwrite only if intentional")
        for rel, name in lookup.items():
            target = ROOT / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            with archive.open(name) as infile, target.open("wb") as outfile:
                shutil.copyfileobj(infile, outfile)
            print("Copied:", rel)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Phase 29A package folder or ZIP")
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()
    source = args.source.expanduser().resolve()
    if source.is_dir():
        import_from_directory(source, args.overwrite)
    elif source.is_file() and zipfile.is_zipfile(source):
        import_from_zip(source, args.overwrite)
    else:
        parser.error("source must be a directory or valid ZIP archive")
    print("Done. Now run: python scripts/smoke_real_data.py")
