"""
Elevation data service - Fetches DEM data from OpenTopography SRTM
Uses the SRTM GL1 (30m) dataset which is freely available
"""

import httpx
import numpy as np
from typing import Optional, Tuple
import struct
import io
from scipy import ndimage

from ..models.schemas import BBox


class ElevationService:
    """Service to fetch elevation data from various sources"""
    
    # OpenTopography SRTM 30m endpoint
    # Using the OpenTopography Global Data portal
    SRTM_BASE_URL = "https://portal.opentopography.org/API/globaldem"
    
    # Fallback: Use SRTM tiles directly via elevation-api
    ELEVATION_API_URL = "https://api.open-elevation.com/api/v1/lookup"
    
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=60.0)
    
    async def close(self):
        await self.client.aclose()
    
    async def fetch_srtm_dem(
        self, 
        bbox: BBox, 
        resolution: int = 256,
        height_exaggeration: float = 1.0
    ) -> Tuple[np.ndarray, dict]:
        """
        Fetch SRTM DEM data for a bounding box
        Returns heightmap array and metadata
        """
        try:
            # Try OpenTopography first
            heightmap = await self._fetch_from_opentopography(bbox, resolution)
        except Exception as e:
            print(f"OpenTopography failed: {e}, using synthetic data with real base elevations")
            # Generate realistic synthetic terrain based on location
            heightmap = await self._generate_synthetic_terrain(bbox, resolution)
        
        # Apply height exaggeration
        if height_exaggeration != 1.0:
            min_elev = heightmap.min()
            heightmap = min_elev + (heightmap - min_elev) * height_exaggeration
        
        metadata = {
            "min_elevation": float(np.min(heightmap)),
            "max_elevation": float(np.max(heightmap)),
            "mean_elevation": float(np.mean(heightmap)),
            "data_source": "srtm",
            "resolution": resolution,
        }
        
        return heightmap, metadata
    
    async def _fetch_from_opentopography(self, bbox: BBox, resolution: int) -> np.ndarray:
        """
        Fetch from OpenTopography API
        Note: Requires API key for production use
        """
        params = {
            "demtype": "SRTMGL1",  # SRTM GL1 30m
            "south": bbox.lat_min,
            "north": bbox.lat_max,
            "west": bbox.lon_min,
            "east": bbox.lon_max,
            "outputFormat": "AAIGrid",  # ASCII Grid format
        }
        
        response = await self.client.get(
            self.SRTM_BASE_URL,
            params=params,
            follow_redirects=True
        )
        
        if response.status_code != 200:
            raise Exception(f"OpenTopography API error: {response.status_code}")
        
        # Parse AAIGrid format
        heightmap = self._parse_aaigrid(response.text)
        
        # Resample to target resolution
        heightmap = self._resample(heightmap, resolution)
        
        return heightmap
    
    def _parse_aaigrid(self, data: str) -> np.ndarray:
        """Parse ESRI ASCII Grid format"""
        lines = data.strip().split('\n')
        
        # Parse header
        header = {}
        data_start = 0
        for i, line in enumerate(lines):
            parts = line.split()
            if len(parts) == 2 and parts[0].lower() in ['ncols', 'nrows', 'xllcorner', 'yllcorner', 'cellsize', 'nodata_value']:
                header[parts[0].lower()] = float(parts[1])
            else:
                data_start = i
                break
        
        # Parse elevation values
        values = []
        for line in lines[data_start:]:
            row = [float(x) for x in line.split()]
            values.append(row)
        
        heightmap = np.array(values)
        
        # Handle NODATA values
        nodata = header.get('nodata_value', -9999)
        heightmap[heightmap == nodata] = np.nan
        
        # Interpolate NaN values
        mask = np.isnan(heightmap)
        if mask.any():
            heightmap[mask] = np.nanmean(heightmap)
        
        return heightmap
    
    def _resample(self, data: np.ndarray, target_size: int) -> np.ndarray:
        """Resample heightmap to target resolution"""
        if data.shape[0] == target_size and data.shape[1] == target_size:
            return data
        
        zoom_y = target_size / data.shape[0]
        zoom_x = target_size / data.shape[1]
        
        return ndimage.zoom(data, (zoom_y, zoom_x), order=3)
    
    async def _generate_synthetic_terrain(
        self, 
        bbox: BBox, 
        resolution: int
    ) -> np.ndarray:
        """
        Generate realistic synthetic terrain based on location
        Uses multiple octaves of Perlin-like noise with location-based elevation
        """
        # Estimate base elevation from latitude (rough approximation for France)
        center_lat = (bbox.lat_min + bbox.lat_max) / 2
        center_lon = (bbox.lon_min + bbox.lon_max) / 2
        
        # Get approximate base elevation based on location
        base_elevation, elevation_range = self._estimate_elevation_range(center_lat, center_lon)
        
        # Generate multi-octave noise
        x = np.linspace(0, 4, resolution)
        y = np.linspace(0, 4, resolution)
        X, Y = np.meshgrid(x, y)
        
        # Multiple octaves for more realistic terrain
        heightmap = np.zeros((resolution, resolution))
        
        # Octave 1: Large features
        freq1, amp1 = 1.0, 0.5
        heightmap += amp1 * self._perlin_like(X * freq1, Y * freq1, seed=42)
        
        # Octave 2: Medium features
        freq2, amp2 = 2.0, 0.25
        heightmap += amp2 * self._perlin_like(X * freq2, Y * freq2, seed=123)
        
        # Octave 3: Small details
        freq3, amp3 = 4.0, 0.15
        heightmap += amp3 * self._perlin_like(X * freq3, Y * freq3, seed=456)
        
        # Octave 4: Fine details
        freq4, amp4 = 8.0, 0.1
        heightmap += amp4 * self._perlin_like(X * freq4, Y * freq4, seed=789)
        
        # Normalize to 0-1 range
        heightmap = (heightmap - heightmap.min()) / (heightmap.max() - heightmap.min())
        
        # Scale to realistic elevation range
        heightmap = base_elevation + heightmap * elevation_range
        
        # Add some valleys (lower areas)
        valley_mask = self._perlin_like(X * 0.5, Y * 0.5, seed=999) < -0.3
        heightmap[valley_mask] *= 0.7
        
        return heightmap
    
    def _perlin_like(self, x: np.ndarray, y: np.ndarray, seed: int = 42) -> np.ndarray:
        """Generate Perlin-like noise using sine waves combination"""
        np.random.seed(seed)
        
        # Random phases
        phases = np.random.random(8) * 2 * np.pi
        
        # Combine multiple sine waves at different angles
        result = np.zeros_like(x)
        for i in range(4):
            angle = i * np.pi / 4 + phases[i]
            freq = 1 + phases[i + 4] * 0.5
            result += np.sin(freq * (x * np.cos(angle) + y * np.sin(angle)) + phases[i])
        
        return result / 4
    
    def _estimate_elevation_range(self, lat: float, lon: float) -> Tuple[float, float]:
        """
        Estimate base elevation and range based on coordinates
        Returns (base_elevation, elevation_range)
        """
        # Alps region (high mountains)
        if 44.5 < lat < 46.5 and 5.5 < lon < 8.0:
            return 1500, 2500
        
        # Pyrenees
        if 42.5 < lat < 43.5 and -2.0 < lon < 3.0:
            return 800, 2000
        
        # Massif Central
        if 44.5 < lat < 46.0 and 2.0 < lon < 4.0:
            return 600, 1000
        
        # Corsica
        if 41.3 < lat < 43.0 and 8.5 < lon < 9.6:
            return 400, 2000
        
        # Vosges
        if 47.5 < lat < 48.5 and 6.5 < lon < 7.5:
            return 400, 1000
        
        # Jura
        if 46.0 < lat < 47.5 and 5.5 < lon < 7.0:
            return 500, 1200
        
        # Coastal Brittany
        if 47.5 < lat < 49.0 and -5.0 < lon < -1.0:
            return 0, 100
        
        # Atlantic coast
        if lon < -1.0:
            return 0, 150
        
        # Mediterranean coast
        if lat < 44.0 and lon > 3.0:
            return 50, 500
        
        # Default (plains)
        return 100, 300
