"""Model laboratory endpoint tests with tiny synthetic summaries (no real MOSDAC data)."""

import json
from pathlib import Path

from app import create_app

from conftest import FakeService


def _seed_analytics(root: Path):
    directory = root / "data" / "analytics"
    directory.mkdir(parents=True, exist_ok=True)
    (directory / "enhanced_kmeans_evaluation.csv").write_text(
        "model,k,wcss,silhouette,davies_bouldin,calinski_harabasz,smallest_cluster_pct\n"
        "Model_A,2,123.8,0.55,0.7,51.2,15\n"
        "Model_A,4,90,0.43,0.8,66.2,8\n"
        "Model_B,5,82,0.31,1.2,49.9,10\n", encoding="utf-8")
    (directory / "final_model_a_profiles.csv").write_text(
        "cluster_id,cluster_rank,cluster_name,mean_aod,cells\n"
        "2,0,Lower Aerosol Loading,0.23,16\n"
        "3,3,Frequent Elevated Loading,0.83,8\n", encoding="utf-8")
    (directory / "final_model_b_profiles.csv").write_text(
        "cluster_id,cluster_rank,cluster_name,mean_aod,cells\n"
        "0,0,Lower Seasonal Loading,0.33,12\n", encoding="utf-8")
    (directory / "alternative_clustering_comparison.csv").write_text(
        "model,algorithm,k,silhouette_euclidean,ari_vs_kmeans\n"
        "Model_A,KMeans,4,0.43,1.0\n"
        "Model_A,GMM,4,0.33,0.7\n"
        "Model_B,Manhattan_KMedians,5,0.25,0.4\n", encoding="utf-8")
    (directory / "final_robustness_summary.csv").write_text(
        "model,seed_mean_ari,seed_min_ari,feature_removal_ari,subsample_mean_ari,subsample_min_ari\n"
        "Model_A,0.99,0.98,0.72,0.9,0.88\n"
        "Model_B,0.95,0.92,0.55,0.91,0.89\n", encoding="utf-8")
    (directory / "pca_cluster_summary.json").write_text(json.dumps({
        "model_a": {"explained_variance_ratio": [0.6, 0.3], "total_explained_variance": 0.9,
                    "centroids": [{"cluster_id": 2, "cells": 16, "PC1": 0.6, "PC2": -0.5}]},
        "model_b": {"explained_variance_ratio": [0.5, 0.2], "total_explained_variance": 0.7,
                    "centroids": [{"cluster_id": 0, "cells": 12, "PC1": -0.1, "PC2": 1.1}]},
    }), encoding="utf-8")
    return directory


def test_research_endpoints_with_synthetic_data(tmp_path):
    _seed_analytics(tmp_path)
    app = create_app({"TESTING": True, "ANALYTICS_DIR": str(tmp_path)}, service=FakeService())
    c = app.test_client()
    status = c.get("/api/v1/models/analytics-status")
    assert status.status_code == 200 and all(status.json["files"].values())

    a = c.get("/api/v1/models/model_a/metrics")
    assert a.status_code == 200
    assert a.json["selected_k"] == 4
    assert a.json["best_silhouette_k"] == 2
    assert [row["k"] for row in a.json["evaluation"]] == [2, 4]
    assert isinstance(a.json["evaluation"][0]["silhouette"], float)

    b = c.get("/api/v1/models/model_b/profiles")
    assert b.status_code == 200 and b.json["profiles"][0]["cluster_name"] == "Lower Seasonal Loading"
    comparisons = c.get("/api/v1/models/model_a/comparisons")
    assert comparisons.status_code == 200 and len(comparisons.json["algorithms"]) == 2
    robustness = c.get("/api/v1/models/model_a/robustness")
    assert robustness.status_code == 200 and robustness.json["summary"]["seed_mean_ari"] == 0.99
    pca = c.get("/api/v1/models/model_a/pca")
    assert pca.status_code == 200
    assert pca.json["point_type"] == "cluster_centroids_only"
    assert len(pca.json["centroids"]) == 1


def test_missing_analytics_file_returns_503(tmp_path):
    app = create_app({"TESTING": True, "ANALYTICS_DIR": str(tmp_path)}, service=FakeService())
    c = app.test_client()
    assert c.get("/api/v1/models/analytics-status").json["files"]["evaluation"] is False
    r = c.get("/api/v1/models/model_a/metrics")
    assert r.status_code == 503 and r.json["error"]["code"] == "analytics_unavailable"


def test_invalid_model_is_400(tmp_path):
    app = create_app({"TESTING": True, "ANALYTICS_DIR": str(tmp_path)}, service=FakeService())
    assert app.test_client().get("/api/v1/models/model_z/profiles").status_code == 400


def test_production_results_policy(tmp_path):
    _seed_analytics(tmp_path)
    app = create_app({
        "TESTING": True, "ENVIRONMENT": "production",
        "ANALYTICS_DIR": str(tmp_path), "PUBLIC_RESULTS_ENABLED": False,
        "ALLOWED_ORIGINS": ["https://aeroscope.example"]
    }, service=FakeService())
    c = app.test_client()
    assert c.get("/api/v1/models/analytics-status").status_code == 200
    for suffix in ("metrics", "profiles", "comparisons", "robustness", "pca"):
        r = c.get(f"/api/v1/models/model_a/{suffix}")
        assert r.status_code == 403, (suffix, r.json)
        assert r.json["error"]["code"] == "public_results_disabled"


def test_importer_does_not_extract_unknown_files(tmp_path, monkeypatch):
    from scripts import import_analytics
    from zipfile import ZipFile

    archive = tmp_path / "input.zip"
    with ZipFile(archive, "w") as z:
        for name in import_analytics.FILES:
            z.writestr("aeroscope_analytics/" + name, "test")
        z.writestr("../evil.txt", "no")
    target = tmp_path / "install" / "data" / "analytics"
    monkeypatch.setattr(import_analytics, "BASE", target)
    import_analytics.import_analytics(archive)
    assert all((target / name).exists() for name in import_analytics.FILES)
    assert not (tmp_path / "evil.txt").exists()
