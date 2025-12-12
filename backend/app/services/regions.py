"""Predefined regions for France - Phase 1 MVP"""

from typing import Dict, List, Optional
from ..models.schemas import Region, BBox


# Predefined regions covering major French geographic features
FRANCE_REGIONS: Dict[str, Region] = {
    "mont-blanc": Region(
        id="mont-blanc",
        name="Mont Blanc",
        bbox=BBox(lat_min=45.78, lat_max=45.90, lon_min=6.80, lon_max=6.95),
        default_resolution=256,
        elevation_range=[1200, 4808],
        data_sources=["srtm"],
        description="Le plus haut sommet des Alpes et d'Europe occidentale"
    ),
    "chamonix": Region(
        id="chamonix",
        name="Vallée de Chamonix",
        bbox=BBox(lat_min=45.88, lat_max=46.02, lon_min=6.82, lon_max=7.02),
        default_resolution=256,
        elevation_range=[1035, 3842],
        data_sources=["srtm"],
        description="Célèbre vallée alpine au pied du Mont Blanc"
    ),
    "massif-central": Region(
        id="massif-central",
        name="Puy de Dôme",
        bbox=BBox(lat_min=45.70, lat_max=45.82, lon_min=2.90, lon_max=3.05),
        default_resolution=256,
        elevation_range=[800, 1465],
        data_sources=["srtm"],
        description="Chaîne des Puys, volcans endormis du Massif Central"
    ),
    "pyrenees": Region(
        id="pyrenees",
        name="Pic du Midi",
        bbox=BBox(lat_min=42.88, lat_max=43.02, lon_min=-0.20, lon_max=0.05),
        default_resolution=256,
        elevation_range=[500, 2872],
        data_sources=["srtm"],
        description="Région du Pic du Midi de Bigorre dans les Pyrénées"
    ),
    "provence": Region(
        id="provence",
        name="Sainte-Victoire",
        bbox=BBox(lat_min=43.48, lat_max=43.58, lon_min=5.52, lon_max=5.72),
        default_resolution=256,
        elevation_range=[200, 1011],
        data_sources=["srtm"],
        description="Montagne emblématique peinte par Cézanne"
    ),
    "ventoux": Region(
        id="ventoux",
        name="Mont Ventoux",
        bbox=BBox(lat_min=44.10, lat_max=44.22, lon_min=5.20, lon_max=5.35),
        default_resolution=256,
        elevation_range=[400, 1909],
        data_sources=["srtm"],
        description="Le Géant de Provence, célèbre étape du Tour de France"
    ),
    "corsica": Region(
        id="corsica",
        name="Monte Cinto (Corse)",
        bbox=BBox(lat_min=42.30, lat_max=42.42, lon_min=8.90, lon_max=9.05),
        default_resolution=256,
        elevation_range=[500, 2706],
        data_sources=["srtm"],
        description="Point culminant de la Corse"
    ),
    "brittany-coast": Region(
        id="brittany-coast",
        name="Côte de Granit Rose",
        bbox=BBox(lat_min=48.78, lat_max=48.88, lon_min=-3.55, lon_max=-3.38),
        default_resolution=256,
        elevation_range=[0, 80],
        data_sources=["srtm"],
        description="Côte spectaculaire aux rochers de granit rose"
    ),
    "vercors": Region(
        id="vercors",
        name="Massif du Vercors",
        bbox=BBox(lat_min=44.95, lat_max=45.12, lon_min=5.40, lon_max=5.60),
        default_resolution=256,
        elevation_range=[200, 2341],
        data_sources=["srtm"],
        description="Forteresse naturelle du plateau du Vercors"
    ),
    "gorges-verdon": Region(
        id="gorges-verdon",
        name="Gorges du Verdon",
        bbox=BBox(lat_min=43.72, lat_max=43.82, lon_min=6.30, lon_max=6.50),
        default_resolution=256,
        elevation_range=[400, 1500],
        data_sources=["srtm"],
        description="Le Grand Canyon de l'Europe"
    ),
    "dune-pilat": Region(
        id="dune-pilat",
        name="Dune du Pilat",
        bbox=BBox(lat_min=44.55, lat_max=44.62, lon_min=-1.22, lon_max=-1.12),
        default_resolution=256,
        elevation_range=[0, 110],
        data_sources=["srtm"],
        description="Plus haute dune d'Europe sur la côte atlantique"
    ),
    "cirque-gavarnie": Region(
        id="cirque-gavarnie",
        name="Cirque de Gavarnie",
        bbox=BBox(lat_min=42.68, lat_max=42.78, lon_min=-0.05, lon_max=0.08),
        default_resolution=256,
        elevation_range=[1300, 3248],
        data_sources=["srtm"],
        description="Amphithéâtre naturel classé UNESCO"
    ),
}


class RegionsService:
    """Service to manage predefined regions"""

    @staticmethod
    def get_all_regions() -> List[Region]:
        """Get all predefined regions"""
        return list(FRANCE_REGIONS.values())

    @staticmethod
    def get_region(region_id: str) -> Optional[Region]:
        """Get a specific region by ID"""
        return FRANCE_REGIONS.get(region_id)

    @staticmethod
    def get_region_ids() -> List[str]:
        """Get all region IDs"""
        return list(FRANCE_REGIONS.keys())
