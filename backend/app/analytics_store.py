"""Read saved research metrics from compact, precomputed notebook exports.

No model training, raw satellite products, or per-grid PCA points are exposed.
"""

import csv
import json
import math
from functools import lru_cache
from pathlib import Path

from .errors import APIError
from .map_metadata import MODEL_LEGENDS

ANALYTICS_FILES = {
    "evaluation": "enhanced_kmeans_evaluation.csv",
    "model_a_profiles": "final_model_a_profiles.csv",
    "model_b_profiles": "final_model_b_profiles.csv",
    "comparison": "alternative_clustering_comparison.csv",
    "robustness": "final_robustness_summary.csv",
    "pca": "pca_cluster_summary.json",
}
MAX_FILE_BYTES = 5 * 1024 * 1024  # These should be compact research summaries.


def _safe_value(value):
    """Convert CSV scalar to an API-friendly number, null, or string."""
    if value is None:
        return None
    if isinstance(value, str):
        value = value.strip()
        if value == "" or value.lower() in {"na", "nan", "null", "none", "inf", "-inf"}:
            return None
        try:
            number = float(value)
        except ValueError:
            return value
        if not math.isfinite(number):
            return None
        # Preserve integral numbers as integers, without changing large values.
        return int(number) if number.is_integer() and abs(number) < 10**15 else number
    return value


@lru_cache(maxsize=24)
def _read_small_csv(path_string, mtime_ns):
    """Memoization keyed by file modification time for quick repeat chart requests."""
    path = Path(path_string)
    with path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames:
            raise APIError("Analytics summary is empty", 503, "analytics_invalid")
        return tuple({key: _safe_value(value) for key, value in row.items()}
                     for row in reader)


class AnalyticsStore:
    def __init__(self, package_root):
        self.directory = Path(package_root) / "data" / "analytics"

    def _path(self, name):
        path = self.directory / ANALYTICS_FILES[name]
        if not path.is_file():
            raise APIError(
                f"Analytics export not installed: {path.name}. Import the Colab analytics ZIP.",
                503,
                "analytics_unavailable",
            )
        if path.stat().st_size > MAX_FILE_BYTES:
            raise APIError("Analytics summary exceeds expected size", 503, "analytics_invalid")
        return path

    def _rows(self, kind, model):
        path = self._path(kind)
        try:
            all_rows = _read_small_csv(str(path), path.stat().st_mtime_ns)
        except (UnicodeError, csv.Error, OSError) as exc:
            raise APIError("Cannot read analytics summary", 503, "analytics_invalid") from exc
        return [row for row in all_rows if row.get("model") == "Model_" + model[-1].upper()]

    def status(self):
        return {
            "models": ["model_a", "model_b"],
            "files": {key: (self.directory / filename).is_file()
                      for key, filename in ANALYTICS_FILES.items()},
            "data_is_live": False,
            "scope": "saved historical model evaluations, not retraining",
        }

    def evaluation(self, model):
        rows = self._rows("evaluation", model)
        if not rows:
            raise APIError("No evaluation results for model", 503, "analytics_invalid")
        rows.sort(key=lambda row: int(row["k"]))
        selected_k = MODEL_LEGENDS[model]["cluster_count"]
        return {
            "model": model,
            "selected_k": selected_k,
            "evaluation": rows,
            "best_silhouette_k": max(rows, key=lambda row: row.get("silhouette") if isinstance(row.get("silhouette"), (int, float)) else -2)["k"],
            "notes": [
                "Selected K values prioritize interpretability and application utility, not only maximum Silhouette.",
                "Silhouette evaluated on at most 3,000 samples; WCSS and Davies-Bouldin are based on the fitted feature space.",
                "Do not directly compare WCSS between Model A and Model B: their feature spaces differ.",
            ],
        }

    def profiles(self, model):
        path = self._path(model + "_profiles")
        try:
            rows = [dict(row) for row in _read_small_csv(str(path), path.stat().st_mtime_ns)]
        except (UnicodeError, csv.Error, OSError) as exc:
            raise APIError("Cannot read cluster profiles", 503, "analytics_invalid") from exc
        if not rows:
            raise APIError("Cluster profiles are empty", 503, "analytics_invalid")
        rows.sort(key=lambda row: int(row["cluster_rank"]))
        return {
            "model": model,
            "cluster_count": len(rows),
            "profiles": rows,
            "notes": "Values are aggregated cluster descriptors, not ground-level PM2.5 measurements.",
        }

    def comparison(self, model):
        rows = self._rows("comparison", model)
        if not rows:
            raise APIError("No alternative-clustering comparison for model", 503, "analytics_invalid")
        return {
            "model": model,
            "algorithms": rows,
            "notes": "ARI and AMI are computed relative to the selected K-Means labels; not ground-truth accuracy.",
        }

    def robustness(self, model):
        rows = self._rows("robustness", model)
        if len(rows) != 1:
            raise APIError("Expected one robustness summary per model", 503, "analytics_invalid")
        return {
            "model": model,
            "summary": rows[0],
            "notes": "ARI measures agreement of cluster assignments under the stated perturbation; it is not predictive accuracy.",
        }

    def pca(self, model):
        path = self._path("pca")
        try:
            with path.open(encoding="utf-8") as handle:
                info = json.load(handle)
        except (OSError, UnicodeError, json.JSONDecodeError) as exc:
            raise APIError("Cannot read PCA summary", 503, "analytics_invalid") from exc
        data = info.get(model)
        if not isinstance(data, dict) or not isinstance(data.get("centroids"), list):
            raise APIError("PCA summary is missing this model", 503, "analytics_invalid")
        return {
            "model": model,
            **data,
            "point_type": "cluster_centroids_only",
            "notes": "PCA axes are model-specific. Centroids do not represent individual geographic cells or a full scatterplot.",
        }
