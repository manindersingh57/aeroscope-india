"""Private, precomputed PCA points for AeroScope Cluster Insights.

Reads saved final-model CSVs, never recalculates PCA or clustering.
Data is only served when the app's public research-results policy allows it.
"""
import csv
import math
import random
from pathlib import Path

from .errors import APIError

MODEL_COUNTS = {"model_a": 4, "model_b": 5}
MAX_FILE_BYTES = 160 * 1024 * 1024
SAMPLE_PER_CLUSTER = 1100


def load_pca_scatter(analytics_root, model):
    if model not in MODEL_COUNTS:
        raise APIError("Unknown clustering model", 400, "invalid_model")
    file_path = Path(analytics_root) / "data" / "pca" / (
        f"final_model_{'a' if model == 'model_a' else 'b'}_clusters.csv"
    )
    if not file_path.is_file():
        raise APIError(
            "Private PCA export not installed in backend/data/pca",
            503, "pca_unavailable",
        )
    if file_path.stat().st_size > MAX_FILE_BYTES:
        raise APIError("PCA file exceeds expected limit", 503, "pca_invalid")

    k = MODEL_COUNTS[model]
    counts = [0] * k
    samples = [[] for _ in range(k)]
    rngs = [random.Random(1800 + rank) for rank in range(k)]
    min_x = min_y = float("inf")
    max_x = max_y = float("-inf")

    try:
        with file_path.open(newline="", encoding="utf-8-sig") as handle:
            reader = csv.DictReader(handle)
            needed = {"PC1", "PC2", "cluster_rank"}
            if not reader.fieldnames or not needed.issubset(reader.fieldnames):
                raise APIError(
                    "PCA CSV must contain PC1, PC2, cluster_rank",
                    503, "pca_invalid",
                )
            for raw in reader:
                try:
                    x, y = float(raw["PC1"]), float(raw["PC2"])
                    rank_float = float(raw["cluster_rank"])
                    rank = int(rank_float)
                except (ValueError, TypeError, KeyError, OverflowError):
                    continue
                if (not math.isfinite(x) or not math.isfinite(y) or
                    not math.isfinite(rank_float) or rank != rank_float or
                    rank < 0 or rank >= k):
                    continue
                counts[rank] += 1
                min_x, max_x = min(min_x, x), max(max_x, x)
                min_y, max_y = min(min_y, y), max(max_y, y)
                aod = None
                if raw.get("mean_aod"):
                    try:
                        val = float(raw["mean_aod"])
                        aod = round(val, 4) if math.isfinite(val) else None
                    except (ValueError, TypeError):
                        pass
                state = str(raw.get("state_name") or "").strip()[:100] or None
                point = {"x": round(x, 5), "y": round(y, 5),
                         "rank": rank, "aod": aod, "state": state}
                if len(samples[rank]) < SAMPLE_PER_CLUSTER:
                    samples[rank].append(point)
                else:
                    # Uniform reservoir sampling. Exact cluster population counts
                    # remain separate from the sampled points returned for display.
                    slot = rngs[rank].randrange(counts[rank])
                    if slot < SAMPLE_PER_CLUSTER:
                        samples[rank][slot] = point
    except (OSError, UnicodeError, csv.Error) as exc:
        raise APIError("Cannot read PCA research export", 503, "pca_invalid") from exc
    if not all(counts):
        raise APIError(
            "One or more final clusters are absent from the PCA CSV",
            503, "pca_invalid",
        )
    return {
        "model": model,
        "counts": counts,
        "total": sum(counts),
        "points": [p for sample in samples for p in sample],
        "extent": {"minX": min_x, "maxX": max_x, "minY": min_y, "maxY": max_y},
        "point_type": "historical_grid_cell_pca_sample",
        "source": "saved private PCA export",
        "note": "Points are a reproducible display sample; cluster percentages use all eligible cells.",
    }
