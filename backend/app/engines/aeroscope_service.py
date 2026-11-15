from pathlib import Path
import json
import math

from .location_engine import AeroScopeLocationEngine
from .regional_engine import AeroScopeRegionalEngine
from .hotspot_engine import AeroScopeHotspotEngine


class AeroScopeService:
    """
    Unified application service for AeroScope India.

    Uses precomputed historical INSAT-3D AOD products.
    Does not perform raw satellite preprocessing.
    """

    def __init__(self, backend_dir=None):

        if backend_dir is None:
            backend_dir = Path(__file__).resolve().parent

        self.backend_dir = Path(backend_dir)

        self.location_engine = AeroScopeLocationEngine(
            self.backend_dir
        )

        self.regional_engine = AeroScopeRegionalEngine(
            self.backend_dir
        )

        self.hotspot_engine = AeroScopeHotspotEngine(
            backend_dir=self.backend_dir,
            source_dir=(
                self.backend_dir /
                "data" /
                "hotspots"
            )
        )

        summary_path = (
            self.backend_dir /
            "data" /
            "dashboard_summary.json"
        )

        with open(summary_path, encoding="utf-8") as f:
            self.dashboard_summary = json.load(f)

    @staticmethod
    def _json_safe(payload):
        """
        Validate JSON compatibility without allowing
        NaN or Infinity values.
        """
        return json.loads(
            json.dumps(
                payload,
                allow_nan=False,
                ensure_ascii=False
            )
        )

    def get_overview(self):

        df = self.location_engine.df

        model_a_count = int(
            df["model_a_available"]
            .astype("string")
            .str.lower()
            .isin(["true", "1"])
            .sum()
        )

        model_b_count = int(
            df["model_b_available"]
            .astype("string")
            .str.lower()
            .isin(["true", "1"])
            .sum()
        )

        payload = {
            "project": "AeroScope India",
            "data_type": "Historical satellite AOD",
            "total_grid_cells": int(len(df)),
            "state_labels": len(
                self.regional_engine.list_states()
            ),
            "model_a_classified_cells": model_a_count,
            "model_b_classified_cells": model_b_count,
            "hotspot_summary": {
                "model_a": self.hotspot_engine.get_summary(
                    "model_a"
                ),
                "model_b": self.hotspot_engine.get_summary(
                    "model_b"
                )
            },
            "scientific_disclaimer": (
                "Historical satellite aerosol optical "
                "depth is not live AQI, PM2.5, "
                "population exposure, or evidence "
                "of a particular emission source."
            )
        }

        return self._json_safe(payload)

    def get_dashboard(self):
        return self._json_safe(self.dashboard_summary)

    def get_location(
        self,
        latitude,
        longitude,
        max_distance_km=None
    ):

        result = self.location_engine.get_location_profile(
            latitude=latitude,
            longitude=longitude,
            max_distance_km=max_distance_km
        )

        return self._json_safe(result)

    def list_states(self):
        return self._json_safe(
            self.regional_engine.list_states()
        )

    def get_state(self, state_name):

        return self._json_safe(
            self.regional_engine.get_state_profile(
                state_name
            )
        )

    def get_state_summaries(self):

        return self._json_safe(
            self.regional_engine.get_all_state_summaries()
        )

    def compare_states(self, state_names):

        return self._json_safe(
            self.regional_engine.compare_states(
                state_names
            )
        )

    def get_hotspot_summary(self, model):

        return self._json_safe(
            self.hotspot_engine.get_summary(model)
        )

    def get_hotspots(
        self,
        model,
        state=None,
        cluster_name=None,
        min_cells=1,
        min_mean_aod=None
    ):

        return self._json_safe(
            self.hotspot_engine.filter_regions(
                model=model,
                state=state,
                cluster_name=cluster_name,
                min_cells=min_cells,
                min_mean_aod=min_mean_aod
            )
        )

    def get_hotspot(self, model, region_id):

        return self._json_safe(
            self.hotspot_engine.get_region(
                model,
                region_id
            )
        )

    def get_largest_hotspots(self, model, limit=10):

        return self._json_safe(
            self.hotspot_engine.get_largest_regions(
                model,
                limit=limit
            )
        )

    def execute(self, operation, **params):
        """
        Controlled dispatcher for future API integration.

        Example:
            service.execute(
                "location",
                latitude=30.901,
                longitude=75.8573
            )
        """

        operations = {
            "overview": self.get_overview,
            "dashboard": self.get_dashboard,
            "location": self.get_location,
            "states": self.list_states,
            "state": self.get_state,
            "state_summaries": self.get_state_summaries,
            "compare_states": self.compare_states,
            "hotspot_summary": self.get_hotspot_summary,
            "hotspots": self.get_hotspots,
            "hotspot": self.get_hotspot,
            "largest_hotspots": self.get_largest_hotspots
        }

        if operation not in operations:
            raise ValueError(
                f"Unsupported operation: {operation}"
            )

        return operations[operation](**params)
