"""Presentation-only model metadata, transcribed from notebook Chunk 20B.

No satellite measurements, coordinates or proprietary raster values are stored here.
"""

MODEL_LEGENDS = {
    "model_a": {
        "title": "Broad Aerosol Loading Patterns",
        "cluster_count": 4,
        "description": "Historical aerosol-loading groups based on the selected Model A.",
        "clusters": [
            {"cluster_id": 2, "rank": 0, "name": "Lower Aerosol Loading", "color": "#2A9D8F", "description": "Relatively lower average aerosol loading and lower temporal variability."},
            {"cluster_id": 0, "rank": 1, "name": "Moderate Aerosol Loading", "color": "#E9C46A", "description": "Intermediate aerosol loading with moderate temporal variability."},
            {"cluster_id": 1, "rank": 2, "name": "Elevated and Variable Loading", "color": "#F4A261", "description": "Elevated aerosol loading with the highest average temporal variability among Model A clusters."},
            {"cluster_id": 3, "rank": 3, "name": "Frequent Elevated Loading", "color": "#D62828", "description": "Highest average aerosol loading and the greatest frequency of elevated AOD observations."},
        ],
    },
    "model_b": {
        "title": "Seasonal Aerosol Behaviour",
        "cluster_count": 5,
        "description": "Historical seasonal aerosol patterns based on the selected Model B.",
        "clusters": [
            {"cluster_id": 0, "rank": 0, "name": "Lower Seasonal Loading", "color": "#2A9D8F", "description": "Relatively lower aerosol loading across the four observed seasonal profiles."},
            {"cluster_id": 1, "rank": 1, "name": "Moderate Pre-monsoon Leaning", "color": "#E9C46A", "description": "Moderate overall aerosol loading, with a slightly higher pre-monsoon mean than monsoon mean."},
            {"cluster_id": 4, "rank": 2, "name": "Monsoon-Dominant Loading", "color": "#457B9D", "description": "Moderate overall loading with a pronounced monsoon aerosol maximum."},
            {"cluster_id": 2, "rank": 3, "name": "Strong Pre-monsoon Peak", "color": "#E76F51", "description": "Strong pre-monsoon aerosol maximum and substantial temporal variability."},
            {"cluster_id": 3, "rank": 4, "name": "Elevated Across Seasons", "color": "#9D174D", "description": "Elevated average aerosol loading across all four seasonal profiles, with relatively smaller seasonal amplitude."},
        ],
    },
}
