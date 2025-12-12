from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class BBox(BaseModel):
    """Bounding box geographic coordinates"""
    lat_min: float = Field(..., description="Minimum latitude")
    lat_max: float = Field(..., description="Maximum latitude")
    lon_min: float = Field(..., description="Minimum longitude")
    lon_max: float = Field(..., description="Maximum longitude")


class TerrainRequest(BaseModel):
    """Request to generate terrain data"""
    region: Optional[str] = Field(None, description="Predefined region ID")
    bbox: Optional[BBox] = Field(None, description="Custom bounding box")
    resolution: int = Field(default=256, ge=64, le=512, description="Grid resolution")
    height_exaggeration: float = Field(default=1.5, ge=0.5, le=5.0)
    data_source: str = Field(default="srtm", description="Data source: srtm")


class TerrainMetadata(BaseModel):
    """Metadata about generated terrain"""
    center_lat: float
    center_lon: float
    min_elevation: float
    max_elevation: float
    data_source: str
    timestamp: datetime
    resolution: int


class TerrainResponse(BaseModel):
    """Response with terrain data"""
    id: str
    heightmap: List[List[float]]
    metadata: TerrainMetadata
    bounds: BBox


class ExportSTLRequest(BaseModel):
    """Request to export terrain as STL"""
    terrain_id: str
    resolution: int = Field(default=256, ge=64, le=512)
    scale_xy: float = Field(default=1.0, ge=0.1, le=10.0)
    scale_z: float = Field(default=1.5, ge=0.5, le=5.0)
    add_base: bool = Field(default=True)
    base_thickness: float = Field(default=5.0, ge=1.0, le=20.0)


class Region(BaseModel):
    """Predefined region"""
    id: str
    name: str
    bbox: BBox
    default_resolution: int = 256
    elevation_range: List[float]
    data_sources: List[str]
    description: Optional[str] = None


class RegionsResponse(BaseModel):
    """List of available regions"""
    regions: List[Region]
