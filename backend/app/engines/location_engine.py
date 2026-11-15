from pathlib import Path
import json
import math

import numpy as np
import pandas as pd
from sklearn.neighbors import BallTree


class AeroScopeLocationEngine:
    """
    Reusable location lookup engine for AeroScope India.

    Finds the nearest Indian satellite grid-cell centre
    using Haversine geographical distance.

    The results represent historical satellite AOD,
    not real-time AQI or ground-level PM2.5.
    """

    EARTH_RADIUS_KM = 6371.0088

    SEASONS = {
        "winter": "winter",
        "pre_monsoon": "premonsoon",
        "monsoon": "monsoon",
        "post_monsoon": "postmonsoon"
    }

    def __init__(self, backend_dir=None):

        if backend_dir is None:
            backend_dir = Path(__file__).resolve().parent

        self.backend_dir = Path(backend_dir)

        data_path = (
            self.backend_dir /
            "data" /
            "india_grid_features.parquet"
        )

        config_path = (
            self.backend_dir /
            "config" /
            "backend_config.json"
        )

        self.df = pd.read_parquet(data_path)

        with open(config_path, encoding="utf-8") as f:
            self.config = json.load(f)

        self.default_max_distance_km = float(
            self.config["lookup"]["default_max_distance_km"]
        )

        # Haversine BallTree uses radians
        coords = np.radians(
            self.df[["latitude", "longitude"]]
            .to_numpy(dtype=float)
        )

        self.tree = BallTree(
            coords,
            metric="haversine"
        )

    @staticmethod
    def clean(value):
        """Convert Pandas/NumPy values into JSON-safe values."""

        if value is None:
            return None

        if isinstance(value, (bool, np.bool_)):
            return bool(value)

        if isinstance(value, (int, np.integer)):
            return int(value)

        if isinstance(value, (float, np.floating)):
            value = float(value)
            return value if math.isfinite(value) else None

        if pd.isna(value):
            return None

        return str(value)

    @staticmethod
    def is_available(value):
        return str(value).strip().lower() in (
            "true", "1"
        )

    def get_location_profile(
        self,
        latitude,
        longitude,
        max_distance_km=None
    ):
        """
        Return the nearest study grid-cell profile.

        The nearest cell is selected geographically,
        regardless of its model eligibility.
        """

        lat = float(latitude)
        lon = float(longitude)

        if (
            not math.isfinite(lat)
            or not math.isfinite(lon)
            or not -90 <= lat <= 90
            or not -180 <= lon <= 180
        ):
            raise ValueError(
                "Invalid latitude or longitude."
            )

        if max_distance_km is None:
            max_distance_km = self.default_max_distance_km

        max_distance_km = float(max_distance_km)

        if (
            not math.isfinite(max_distance_km)
            or max_distance_km <= 0
        ):
            raise ValueError(
                "max_distance_km must be positive and finite."
            )

        query = np.radians([[lat, lon]])

        distances, indices = self.tree.query(
            query,
            k=1
        )

        distance_km = float(
            distances[0, 0] * self.EARTH_RADIUS_KM
        )

        index = int(indices[0, 0])

        if distance_km > max_distance_km:

            return {
                "status": "outside_lookup_radius",
                "query": {
                    "latitude": lat,
                    "longitude": lon
                },
                "nearest_distance_km": round(
                    distance_km, 3
                ),
                "max_distance_km": max_distance_km,
                "profile": None,
                "message": (
                    "No Indian study grid-cell centre "
                    "within the specified lookup radius."
                )
            }

        row = self.df.iloc[index]

        def field(name):
            return self.clean(row.get(name))

        model_a_available = self.is_available(
            row["model_a_available"]
        )

        model_b_available = self.is_available(
            row["model_b_available"]
        )

        # --------------------------------------------
        # Seasonal information
        # --------------------------------------------

        seasonal = {}

        for season, prefix in self.SEASONS.items():

            seasonal[season] = {
                "mean_aod": field(
                    prefix + "_mean"
                ),
                "valid_days": field(
                    prefix + "_valid_days"
                ),
                "represented_months": field(
                    prefix + "_represented_months"
                )
            }

        # --------------------------------------------
        # Model classification information
        # --------------------------------------------

        def model_profile(prefix, available):

            if not available:
                return {
                    "available": False,
                    "cluster_id": None,
                    "cluster_rank": None,
                    "cluster_name": None,
                    "membership_strength": None,
                    "reason": "Insufficient data"
                }

            return {
                "available": True,
                "cluster_id": field(
                    prefix + "_cluster_id"
                ),
                "cluster_rank": field(
                    prefix + "_cluster_rank"
                ),
                "cluster_name": field(
                    prefix + "_cluster_name"
                ),
                "membership_strength": field(
                    prefix + "_membership_strength"
                ),
                "reason": None
            }

        # --------------------------------------------
        # Assemble location profile
        # --------------------------------------------

        profile = {
            "cell_id": field("cell_id"),
            "row": field("row"),
            "col": field("col"),
            "state_name": field("state_name"),

            "grid_center": {
                "latitude": field("latitude"),
                "longitude": field("longitude")
            },

            "distance_km": round(distance_km, 3),

            "aerosol": {
                "mean_aod": field("mean_aod"),
                "median_aod": field("median_aod"),
                "std_aod": field("std_aod"),
                "p90_aod": field("p90_aod"),
                "max_aod": field("max_aod"),
                "high_aod_frequency": field(
                    "high_aod_frequency"
                ),
                "valid_days": field("valid_days"),
                "coverage_fraction": field(
                    "coverage_fraction"
                )
            },

            "seasonal": seasonal,

            "model_a": model_profile(
                "model_a",
                model_a_available
            ),

            "model_b": model_profile(
                "model_b",
                model_b_available
            )
        }

        has_aod = (
            profile["aerosol"]["mean_aod"] is not None
        )

        return {
            "status": (
                "success"
                if has_aod
                else "insufficient_observations"
            ),
            "query": {
                "latitude": lat,
                "longitude": lon
            },
            "profile": profile,
            "message": (
                "Historical satellite grid-cell profile."
                if has_aod
                else "Nearest cell has no valid mean AOD."
            )
        }
