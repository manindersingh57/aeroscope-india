"""Sanity checks for conservative git-data audit rule matching."""
from scripts.audit_git_data import unsafe_path


def test_blocks_raw_satellite_products_and_research_tables():
    for path in (
        'backend/data/india_grid_features.parquet',
        'backend/data/analytics/enhanced_kmeans_evaluation.csv',
        'backend/data/hotspots/model_a_elevated_regions.csv',
        'backend/config/backend_config.json',
        'backend/.env',
        'research/raw/3dimg_aod.tif',
        'aeroscope_analytics.zip',
    ):
        assert unsafe_path(path), path


def test_allows_normal_source_and_example_env():
    for path in (
        'backend/app/__init__.py',
        'backend/data/README.md',
        'backend/config/README.md',
        'backend/.env.example',
        'backend/docs/openapi.json',
    ):
        assert not unsafe_path(path), path
