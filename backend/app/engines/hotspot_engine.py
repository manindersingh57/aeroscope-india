from pathlib import Path
import math
import pandas as pd
import numpy as np


class AeroScopeHotspotEngine:
    """
    Query precomputed spatially connected aerosol regions.

    Regions are derived from historical satellite AOD
    clustering. They do not identify pollution sources.
    """

    REQUIRED_COLUMNS = [
        "region_id",
        "cluster_rank",
        "cluster_name",
        "cells",
        "mean_aod",
        "mean_high_aod_frequency",
        "center_latitude",
        "center_longitude",
        "min_latitude",
        "max_latitude",
        "min_longitude",
        "max_longitude",
        "median_valid_days",
        "states",
        "region_rank"
    ]

    SOURCE_NAMES = {
        "model_a": "model_a_elevated_regions.csv",
        "model_b": "model_b_elevated_regions.csv"
    }

    def __init__(self, backend_dir=None, source_dir=None):

        if backend_dir is None:
            backend_dir = Path(__file__).resolve().parent

        self.backend_dir = Path(backend_dir)

        if source_dir is None:
            source_dir = (
                self.backend_dir.parent /
                "outputs" /
                "results"
            )

        self.source_dir = Path(source_dir)

        self.regions = {}

        for model, filename in self.SOURCE_NAMES.items():

            path = self.source_dir / filename

            if not path.exists():
                raise FileNotFoundError(path)

            df = pd.read_csv(path)

            missing = [
                col for col in self.REQUIRED_COLUMNS
                if col not in df.columns
            ]

            if missing:
                raise ValueError(
                    f"{model} missing columns: {missing}"
                )

            if df["region_id"].duplicated().any():
                raise ValueError(
                    f"{model} has duplicate region IDs."
                )

            self.regions[model] = df.copy()

    @staticmethod
    def _validate_model(model):

        if model not in ("model_a", "model_b"):
            raise ValueError(
                "model must be 'model_a' or 'model_b'"
            )

    @staticmethod
    def _clean(value):

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

    def _record(self, model, row):

        states = [
            s.strip()
            for s in str(row["states"]).split(",")
            if s.strip()
        ]

        return {
            "model": model,
            "region_id": int(row["region_id"]),
            "region_rank": int(row["region_rank"]),
            "cluster_rank": int(row["cluster_rank"]),
            "cluster_name": str(row["cluster_name"]),
            "grid_cells": int(row["cells"]),

            "mean_aod": self._clean(row["mean_aod"]),

            "mean_high_aod_frequency": self._clean(
                row["mean_high_aod_frequency"]
            ),

            "median_valid_days": self._clean(
                row["median_valid_days"]
            ),

            "center": {
                "latitude": self._clean(
                    row["center_latitude"]
                ),
                "longitude": self._clean(
                    row["center_longitude"]
                )
            },

            "bounds": {
                "south": self._clean(
                    row["min_latitude"]
                ),
                "north": self._clean(
                    row["max_latitude"]
                ),
                "west": self._clean(
                    row["min_longitude"]
                ),
                "east": self._clean(
                    row["max_longitude"]
                )
            },

            "states": states
        }

    def list_clusters(self, model):

        self._validate_model(model)

        return sorted(
            self.regions[model]["cluster_name"]
            .dropna()
            .unique()
            .tolist()
        )

    def get_largest_regions(self, model, limit=10):

        self._validate_model(model)

        limit = int(limit)

        if limit < 1:
            raise ValueError("limit must be >= 1")

        frame = (
            self.regions[model]
            .sort_values(
                ["cells", "region_rank"],
                ascending=[False, True]
            )
            .head(limit)
        )

        return [
            self._record(model, row)
            for _, row in frame.iterrows()
        ]

    def get_region(self, model, region_id):

        self._validate_model(model)

        region_id = int(region_id)

        matches = self.regions[model].loc[
            self.regions[model]["region_id"] == region_id
        ]

        if matches.empty:
            return None

        return self._record(
            model,
            matches.iloc[0]
        )

    def filter_regions(
        self,
        model,
        cluster_name=None,
        state=None,
        min_cells=1,
        min_mean_aod=None
    ):

        self._validate_model(model)

        frame = self.regions[model].copy()

        min_cells = int(min_cells)

        if min_cells < 1:
            raise ValueError("min_cells must be >= 1")

        frame = frame.loc[
            frame["cells"] >= min_cells
        ]

        if cluster_name is not None:

            frame = frame.loc[
                frame["cluster_name"]
                .str.casefold()
                == str(cluster_name).strip().casefold()
            ]

        if state is not None:

            target = str(state).strip().casefold()

            frame = frame.loc[
                frame["states"].apply(
                    lambda value: target in [
                        item.strip().casefold()
                        for item in str(value).split(",")
                    ]
                )
            ]

        if min_mean_aod is not None:

            threshold = float(min_mean_aod)

            if not math.isfinite(threshold):
                raise ValueError(
                    "min_mean_aod must be finite"
                )

            frame = frame.loc[
                frame["mean_aod"] >= threshold
            ]

        frame = frame.sort_values(
            ["cells", "region_rank"],
            ascending=[False, True]
        )

        return [
            self._record(model, row)
            for _, row in frame.iterrows()
        ]

    def get_summary(self, model):

        self._validate_model(model)

        frame = self.regions[model]

        return {
            "model": model,
            "qualifying_regions": int(len(frame)),
            "total_region_cells": int(
                frame["cells"].sum()
            ),
            "largest_region_cells": (
                int(frame["cells"].max())
                if len(frame) else 0
            ),
            "cluster_counts": {
                str(name): int(count)
                for name, count in (
                    frame["cluster_name"]
                    .value_counts()
                    .items()
                )
            },
            "interpretation": (
                "Precomputed connected aerosol-pattern "
                "regions. Region sizes are grid-cell counts, "
                "not physical area or population exposure."
            )
        }
