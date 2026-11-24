"""Export a *private, local-only* Geo Explorer grid from the existing AeroScope parquet.

Run at project root (with backend venv activated):
    python tools/export_geoexplorer_local.py

Output is written to ~/Downloads, OUTSIDE the repository, to avoid accidental
GitHub / Vercel publication. The browser imports the JSON in-memory via file picker.
DO NOT publish, commit, or redistribute exported rows without the MOSDAC licence clearance.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from statistics import median

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = ROOT / "backend" / "data" / "india_grid_features.parquet"
DEFAULT_OUTPUT = Path.home() / "Downloads" / "aeroscope-local-geolayers.json"
REQUIRED = ["latitude", "longitude", "mean_aod", "model_a_cluster_rank", "model_b_cluster_rank", "state_name"]


def clean_number(value, digits=5):
    try:
        number = float(value)
        return round(number, digits) if math.isfinite(number) else None
    except (TypeError, ValueError):
        return None


def clean_rank(row, prefix, max_rank):
    # Don't show the model's color for cells which were not eligible.
    available = str(row.get(prefix + "_available", "False")).strip().lower() in ("true", "1", "1.0")
    if not available:
        return None
    value = clean_number(row.get(prefix + "_cluster_rank"), 0)
    if value is None:
        return None
    rank = int(value)
    return rank if 0 <= rank <= max_rank else None


def grid_step(values, default):
    # Grid is ~0.11 degrees per cell in the project's 291x291 regional raster.
    unique = sorted({round(float(v), 6) for v in values if pd.notna(v)})
    diffs = [b - a for a, b in zip(unique, unique[1:]) if 0.03 < b - a < 0.3]
    return round(median(diffs), 6) if diffs else default


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    source = args.input.expanduser().resolve()
    target = args.output.expanduser().resolve()
    if not source.is_file():
        raise SystemExit(f"Source missing: {source}\nFirst import your real model data into backend/data.")
    frame = pd.read_parquet(source)
    missing = [name for name in REQUIRED if name not in frame.columns]
    if missing:
        raise SystemExit(f"Missing columns: {', '.join(missing)}\nColumns found: {', '.join(frame.columns)}")
    rows = []
    for _, row in frame.iterrows():
        lat = clean_number(row["latitude"])
        lon = clean_number(row["longitude"])
        if lat is None or lon is None or not (5 <= lat <= 39 and 67 <= lon <= 99):
            continue
        mean = clean_number(row["mean_aod"], 4)
        state = row["state_name"]
        if pd.isna(state):
            state = None
        else:
            state = str(state).strip() or None
        days = clean_number(row.get("valid_days"), 0)
        rows.append([
            lat, lon, mean,
            clean_rank(row, "model_a", 3),
            clean_rank(row, "model_b", 4),
            state, int(days) if days is not None else None,
        ])
    if not rows:
        raise SystemExit("No geographic study cells found. Check the data file.")
    data = {
        "schema": "aeroscope-local-geo-v1",
        "description": "Local-only INSAT-3D historical grid from validated AeroScope processed outputs",
        "fields": ["latitude", "longitude", "mean_aod", "model_a_cluster_rank", "model_b_cluster_rank", "state_name", "valid_days"],
        "cell_step": {
            "lat": grid_step(frame["latitude"], 0.11),
            "lon": grid_step(frame["longitude"], 0.103),
        },
        "cells": rows,
    }
    if target.is_relative_to(ROOT):
        raise SystemExit("For data safety, --output must be OUTSIDE the Git repository.")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(data, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    print(f"Exported {len(rows):,} real study cells to {target}")
    print("PRIVATE LOCAL FILE: do not commit/upload this derived research data.")
    print("Open Geo Explorer in your browser, click 'Load local research grid', and select this JSON.")


if __name__ == "__main__":
    main()
