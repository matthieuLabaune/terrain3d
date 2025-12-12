"""
Terrain API Router - Main endpoints for terrain generation and export
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from datetime import datetime
from typing import Dict
import uuid

from ..models import (
    TerrainRequest,
    TerrainResponse,
    ExportSTLRequest,
    RegionsResponse,
    TerrainMetadata,
)
from ..services import ElevationService, STLGenerator, RegionsService

router = APIRouter(prefix="/api", tags=["terrain"])

# In-memory cache for generated terrains
terrain_cache: Dict[str, dict] = {}

# Services
elevation_service = ElevationService()


@router.get("/list-locations", response_model=RegionsResponse)
async def list_locations():
    """Get all available predefined regions"""
    regions = RegionsService.get_all_regions()
    return RegionsResponse(regions=regions)


@router.post("/terrain", response_model=TerrainResponse)
async def generate_terrain(request: TerrainRequest):
    """
    Generate terrain heightmap data for 3D visualization
    
    Either provide a predefined region ID or a custom bounding box
    """
    # Get bounding box from region or request
    if request.region:
        region = RegionsService.get_region(request.region)
        if not region:
            raise HTTPException(
                status_code=404, 
                detail=f"Region '{request.region}' not found. Use /api/list-locations to see available regions."
            )
        bbox = region.bbox
    elif request.bbox:
        bbox = request.bbox
    else:
        raise HTTPException(
            status_code=400,
            detail="Either 'region' or 'bbox' must be provided"
        )
    
    # Fetch elevation data
    try:
        heightmap, metadata = await elevation_service.fetch_srtm_dem(
            bbox=bbox,
            resolution=request.resolution,
            height_exaggeration=request.height_exaggeration
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch elevation data: {str(e)}"
        )
    
    # Generate unique ID
    terrain_id = str(uuid.uuid4())
    
    # Calculate center coordinates
    center_lat = (bbox.lat_min + bbox.lat_max) / 2
    center_lon = (bbox.lon_min + bbox.lon_max) / 2
    
    # Build response
    terrain_metadata = TerrainMetadata(
        center_lat=center_lat,
        center_lon=center_lon,
        min_elevation=metadata["min_elevation"],
        max_elevation=metadata["max_elevation"],
        data_source=metadata["data_source"],
        timestamp=datetime.utcnow(),
        resolution=request.resolution
    )
    
    response = TerrainResponse(
        id=terrain_id,
        heightmap=heightmap.tolist(),
        metadata=terrain_metadata,
        bounds=bbox
    )
    
    # Cache the terrain data
    terrain_cache[terrain_id] = {
        "heightmap": heightmap,
        "metadata": terrain_metadata,
        "bounds": bbox,
        "region": request.region
    }
    
    # Clean old cache entries (keep last 100)
    if len(terrain_cache) > 100:
        oldest_keys = list(terrain_cache.keys())[:-100]
        for key in oldest_keys:
            del terrain_cache[key]
    
    return response


@router.get("/terrain/{terrain_id}")
async def get_terrain(terrain_id: str):
    """Get previously generated terrain data from cache"""
    if terrain_id not in terrain_cache:
        raise HTTPException(
            status_code=404,
            detail="Terrain not found. It may have expired or been cleared from cache."
        )
    
    cached = terrain_cache[terrain_id]
    
    return TerrainResponse(
        id=terrain_id,
        heightmap=cached["heightmap"].tolist(),
        metadata=cached["metadata"],
        bounds=cached["bounds"]
    )


@router.post("/export-stl")
async def export_stl(request: ExportSTLRequest):
    """
    Export terrain as STL file for 3D printing
    
    Returns binary STL file
    """
    if request.terrain_id not in terrain_cache:
        raise HTTPException(
            status_code=404,
            detail="Terrain not found. Please generate terrain first using /api/terrain"
        )
    
    cached = terrain_cache[request.terrain_id]
    heightmap = cached["heightmap"]
    
    # Resample if different resolution requested
    if request.resolution != cached["metadata"].resolution:
        from scipy import ndimage
        zoom = request.resolution / heightmap.shape[0]
        heightmap = ndimage.zoom(heightmap, zoom, order=3)
    
    # Generate STL
    try:
        stl_bytes = STLGenerator.heightmap_to_stl(
            heightmap=heightmap,
            scale_xy=request.scale_xy,
            scale_z=request.scale_z,
            add_base=request.add_base,
            base_thickness=request.base_thickness
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate STL: {str(e)}"
        )
    
    # Generate filename
    region_name = cached.get("region", "terrain")
    filename = f"terrain_{region_name}_{request.resolution}.stl"
    
    return Response(
        content=stl_bytes,
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


@router.get("/estimate")
async def estimate_export(resolution: int = 256, add_base: bool = True, scale: float = 1.0):
    """Get estimates for STL file size and print time"""
    file_size = STLGenerator.estimate_file_size(resolution, add_base)
    print_time = STLGenerator.estimate_print_time(resolution, scale)
    
    return {
        "file_size_bytes": file_size,
        "file_size_mb": round(file_size / (1024 * 1024), 2),
        "estimated_triangles": file_size // 50,
        "estimated_print_time": print_time
    }


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "terrain3d-api",
        "version": "1.0.0"
    }
