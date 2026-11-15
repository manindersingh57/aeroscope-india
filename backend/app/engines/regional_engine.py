from pathlib import Path
import math
import numpy as np
import pandas as pd


class AeroScopeRegionalEngine:
    """
    Regional analysis of historical INSAT-3D AOD.

    All regional means are unweighted averages of
    available grid-cell summary values.

    They are NOT population-weighted exposure,
    live AQI, or ground-level PM2.5 measurements.
    """

    SEASONS = {
        "winter": "winter_mean",
        "pre_monsoon": "premonsoon_mean",
        "monsoon": "monsoon_mean",
        "post_monsoon": "postmonsoon_mean"
    }

    def __init__(self, backend_dir=None):

        if backend_dir is None:
            backend_dir = Path(__file__).resolve().parent

        self.backend_dir = Path(backend_dir)

        self.df = pd.read_parquet(
            self.backend_dir /
            "data" /
            "india_grid_features.parquet"
        )

        self.df["state_name"] = (
            self.df["state_name"]
            .astype("string")
            .str.strip()
        )

        self.df["model_a_eligible"] = self._mask(
            self.df["model_a_available"]
        )

        self.df["model_b_eligible"] = self._mask(
            self.df["model_b_available"]
        )

    @staticmethod
    def _mask(series):
        return (
            series.astype("string")
            .str.strip()
            .str.lower()
            .isin(["true", "1"])
            .fillna(False)
            .to_numpy(dtype=bool)
        )

    @staticmethod
    def _number(value, digits=4):
        if pd.isna(value):
            return None

        value = float(value)

        if not math.isfinite(value):
            return None

        return round(value, digits)

    @staticmethod
    def _distribution(frame, model):

        flag = f"{model}_eligible"
        name = f"{model}_cluster_name"

        eligible = frame.loc[frame[flag]]

        counts = eligible[name].value_counts()

        total = len(eligible)

        return [
            {
                "cluster": str(cluster),
                "cells": int(count),
                "percent_of_eligible": round(
                    100 * count / total, 2
                ) if total else 0.0
            }
            for cluster, count in counts.items()
        ]

    def list_states(self):

        return sorted(
            self.df["state_name"]
            .dropna()
            .unique()
            .tolist()
        )

    def _resolve_state(self, name):

        if not isinstance(name, str) or not name.strip():
            raise ValueError("Provide a nonempty state name.")

        matches = [
            state
            for state in self.list_states()
            if state.casefold() == name.strip().casefold()
        ]

        if not matches:
            raise ValueError(
                f"State '{name}' not found. "
                "Use list_states() to see available names."
            )

        return matches[0]

    def get_state_profile(self, state_name):

        state = self._resolve_state(state_name)

        frame = self.df.loc[
            self.df["state_name"] == state
        ]

        total = len(frame)

        valid = pd.to_numeric(
            frame["mean_aod"], errors="coerce"
        )

        valid_count = int(valid.notna().sum())

        count_a = int(frame["model_a_eligible"].sum())
        count_b = int(frame["model_b_eligible"].sum())

        # Seasonal means over all available cells.
        # Geographic samples may differ by season.
        seasonal = {}

        for season, column in self.SEASONS.items():

            values = pd.to_numeric(
                frame[column], errors="coerce"
            )

            seasonal[season] = {
                "mean_aod": self._number(values.mean()),
                "median_aod": self._number(values.median()),
                "valid_cells": int(values.notna().sum())
            }

        # Fairer seasonal comparison using the same
        # Model B eligible cells in every season.
        matched = frame.loc[
            frame["model_b_eligible"],
            list(self.SEASONS.values())
        ].dropna()

        matched_seasons = {}

        for season, column in self.SEASONS.items():

            values = pd.to_numeric(
                matched[column], errors="coerce"
            )

            matched_seasons[season] = {
                "mean_aod": self._number(values.mean()),
                "median_aod": self._number(values.median())
            }

        return {
            "state": state,

            "coverage": {
                "total_grid_cells": total,
                "valid_aod_cells": valid_count,
                "valid_aod_percent": round(
                    100 * valid_count / total, 2
                ),
                "model_a_cells": count_a,
                "model_a_percent": round(
                    100 * count_a / total, 2
                ),
                "model_b_cells": count_b,
                "model_b_percent": round(
                    100 * count_b / total, 2
                )
            },

            "aerosol": {
                "mean_aod": self._number(valid.mean()),
                "median_cell_mean_aod": self._number(
                    valid.median()
                ),
                "std_of_cell_mean_aod": self._number(
                    valid.std()
                ),
                "min_cell_mean_aod": self._number(
                    valid.min()
                ),
                "max_cell_mean_aod": self._number(
                    valid.max()
                )
            },

            "seasonal_all_available": seasonal,

            "seasonal_matched": {
                "matched_cells": int(len(matched)),
                "seasons": matched_seasons
            },

            "model_a_distribution": self._distribution(
                frame, "model_a"
            ),

            "model_b_distribution": self._distribution(
                frame, "model_b"
            ),

            "interpretation": (
                "Regional statistics describe historical "
                "satellite AOD grid-cell summaries. "
                "They are not direct exposure estimates. "
                "Unmatched seasonal averages may use "
                "different geographic samples."
            )
        }

    def get_all_state_summaries(self):

        results = []

        for state in self.list_states():

            profile = self.get_state_profile(state)

            coverage = profile["coverage"]
            aerosol = profile["aerosol"]

            results.append({
                "state": state,
                "total_grid_cells":
                    coverage["total_grid_cells"],
                "valid_aod_cells":
                    coverage["valid_aod_cells"],
                "valid_aod_percent":
                    coverage["valid_aod_percent"],
                "mean_aod":
                    aerosol["mean_aod"],
                "model_a_percent":
                    coverage["model_a_percent"],
                "model_b_percent":
                    coverage["model_b_percent"]
            })

        return results

    def compare_states(self, state_names):

        if not isinstance(state_names, (list, tuple)):
            raise ValueError(
                "Provide a list of state names."
            )

        if len(state_names) < 2:
            raise ValueError(
                "At least two states are required."
            )

        profiles = [
            self.get_state_profile(name)
            for name in state_names
        ]

        return {
            "states": profiles,
            "comparison_note": (
                "State mean AOD values are unweighted "
                "averages of available grid-cell means. "
                "Different states may have different "
                "observation coverage. Matched seasonal "
                "comparisons use the same cells within "
                "each state, but not identical locations "
                "between states."
            )
        }
