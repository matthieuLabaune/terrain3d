"""
Elevation data service - Fetches real DEM data from Open-Elevation API
Uses SRTM data which provides ~30m resolution elevation data
Includes smart interpolation for smooth terrain at any resolution
"""

import httpx
import numpy as np
from typing import Tuple
import asyncio
from scipy import ndimage
from scipy.interpolate import RectBivariateSpline

from ..models.schemas import BBox


class ElevationService:
    """Service to fetch real elevation data from Open-Elevation API"""

    # Open-Elevation API - free, no API key required
    OPEN_ELEVATION_URL = "https://api.open-elevation.com/api/v1/lookup"
    
    # SRTM native resolution is ~30m, so ~1200 points per degree
    # We fetch at optimal resolution then interpolate for smoothness
    OPTIMAL_FETCH_RESOLUTION = 64  # Fetch at this resolution max
    
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=120.0)

    async def close(self):
        await self.client.aclose()

    async def fetch_srtm_dem(
        self,
        bbox: BBox,
        resolution: int = 256,
        height_exaggeration: float = 1.0
    ) -> Tuple[np.ndarray, dict]:
        """
        Fetch real SRTM DEM data for a bounding box
        Returns heightmap array and metadata
        
        Strategy: Fetch at optimal resolution (64x64) then use bicubic 
        interpolation to upsample. This avoids the "Lego" effect caused
        by requesting more points than SRTM's native resolution.
        """
        print(f"Fetching real elevation data for bbox: {bbox.lat_min:.2f}-{bbox.lat_max:.2f}N, {bbox.lon_min:.2f}-{bbox.lon_max:.2f}E")

        # Calculate optimal fetch resolution based on bounding box size
        lat_range = bbox.lat_max - bbox.lat_min
        lon_range = bbox.lon_max - bbox.lon_min
        
        # SRTM is ~30m resolution = ~0.00028 degrees
        # Calculate how many real data points exist in the bbox
        srtm_resolution_deg = 0.00028
        max_real_points_lat = int(lat_range / srtm_resolution_deg)
        max_real_points_lon = int(lon_range / srtm_resolution_deg)
        max_real_points = min(max_real_points_lat, max_real_points_lon)
        
        # Fetch resolution: min of requested, optimal, and available real points
        fetch_resolution = min(resolution, self.OPTIMAL_FETCH_RESOLUTION, max(32, max_real_points))
        
        print(f"  Bbox covers ~{max_real_points} real SRTM points")
        print(f"  Fetching at {fetch_resolution}x{fetch_resolution}, will interpolate to {resolution}x{resolution}")

        try:
            # Fetch real elevation data from Open-Elevation
            raw_heightmap = await self._fetch_from_open_elevation(bbox, fetch_resolution)
            data_source = "srtm_real"
            print(f"Successfully fetched real elevation data: {fetch_resolution}x{fetch_resolution}")
            
            # Smooth and interpolate to target resolution
            heightmap = self._smooth_and_interpolate(raw_heightmap, resolution)
            print(f"Interpolated to {resolution}x{resolution} with bicubic smoothing")
            
        except Exception as e:
            print(f"Open-Elevation API failed: {e}")
            print("Falling back to synthetic terrain generation...")
            heightmap = self._generate_synthetic_terrain(bbox, resolution)
            data_source = "synthetic"

        # Apply height exaggeration
        if height_exaggeration != 1.0:
            min_elev = heightmap.min()
            heightmap = min_elev + (heightmap - min_elev) * height_exaggeration

        metadata = {
            "min_elevation": float(np.min(heightmap)),
            "max_elevation": float(np.max(heightmap)),
            "mean_elevation": float(np.mean(heightmap)),
            "data_source": data_source,
            "resolution": resolution,
            "fetch_resolution": fetch_resolution,
        }

        return heightmap, metadata

    def _smooth_and_interpolate(self, heightmap: np.ndarray, target_resolution: int) -> np.ndarray:
        """
        Smooth and interpolate heightmap to target resolution using bicubic splines.
        This creates a much smoother result than raw SRTM data.
        """
        current_resolution = heightmap.shape[0]
        
        # If already at target resolution, just smooth slightly
        if current_resolution == target_resolution:
            return ndimage.gaussian_filter(heightmap.astype(float), sigma=0.5)
        
        # Apply light smoothing to source data first
        smoothed = ndimage.gaussian_filter(heightmap.astype(float), sigma=0.8)
        
        # Create coordinate grids for interpolation
        x_old = np.linspace(0, 1, current_resolution)
        y_old = np.linspace(0, 1, current_resolution)
        
        # Create bicubic spline interpolator (k=3 for cubic)
        spline = RectBivariateSpline(x_old, y_old, smoothed, kx=3, ky=3)
        
        # Evaluate on new grid
        x_new = np.linspace(0, 1, target_resolution)
        y_new = np.linspace(0, 1, target_resolution)
        
        interpolated = spline(x_new, y_new)
        
        # Final light smoothing to remove any interpolation artifacts
        result = ndimage.gaussian_filter(interpolated, sigma=0.3)
        
        return result

    async def _fetch_from_open_elevation(self, bbox: BBox, resolution: int) -> np.ndarray:
        """
        Fetch elevation data from Open-Elevation API
        This API provides real SRTM data for free
        """
        # Create grid of lat/lon points
        lats = np.linspace(bbox.lat_max, bbox.lat_min, resolution)  # North to South
        lons = np.linspace(bbox.lon_min, bbox.lon_max, resolution)  # West to East

        # Build list of all points
        locations = []
        for lat in lats:
            for lon in lons:
                locations.append({"latitude": float(lat), "longitude": float(lon)})

        total_points = len(locations)
        print(f"Requesting {total_points} elevation points...")

        # API has limits, so we batch requests (max ~1000 points per request)
        batch_size = 500
        all_elevations = []

        for i in range(0, total_points, batch_size):
            batch = locations[i:i + batch_size]

            try:
                response = await self.client.post(
                    self.OPEN_ELEVATION_URL,
                    json={"locations": batch},
                    timeout=60.0
                )

                if response.status_code == 200:
                    data = response.json()
                    elevations = [r["elevation"] for r in data["results"]]
                    all_elevations.extend(elevations)
                    print(f"  Batch {i//batch_size + 1}/{(total_points + batch_size - 1)//batch_size}: {len(elevations)} points")
                else:
                    raise Exception(f"API returned status {response.status_code}")

            except Exception as e:
                print(f"  Batch failed: {e}")
                raise

            # Small delay between batches to be nice to the API
            if i + batch_size < total_points:
                await asyncio.sleep(0.5)

        # Reshape to 2D grid
        heightmap = np.array(all_elevations).reshape(resolution, resolution)

        # Handle any -32768 (no data) values by interpolation
        no_data_mask = heightmap < -1000
        if np.any(no_data_mask):
            heightmap[no_data_mask] = np.nan
            heightmap = np.nan_to_num(heightmap, nan=np.nanmean(heightmap))

        return heightmap

    def _generate_synthetic_terrain(self, bbox: BBox, resolution: int) -> np.ndarray:
        """
        Generate realistic synthetic terrain based on location
        Used as fallback when API fails
        """
        center_lat = (bbox.lat_min + bbox.lat_max) / 2
        center_lon = (bbox.lon_min + bbox.lon_max) / 2

        base_elevation, elevation_range = self._estimate_elevation_range(center_lat, center_lon)

        # Generate multi-octave noise
        x = np.linspace(0, 4, resolution)
        y = np.linspace(0, 4, resolution)
        X, Y = np.meshgrid(x, y)

        heightmap = np.zeros((resolution, resolution))

        # Multiple octaves for realistic terrain
        for i, (freq, amp, seed) in enumerate([
            (1.0, 0.5, 42),
            (2.0, 0.25, 123),
            (4.0, 0.15, 456),
            (8.0, 0.1, 789)
        ]):
            heightmap += amp * self._perlin_like(X * freq, Y * freq, seed)

        # Normalize and scale
        heightmap = (heightmap - heightmap.min()) / (heightmap.max() - heightmap.min())
        heightmap = base_elevation + heightmap * elevation_range

        return heightmap

    def _perlin_like(self, x: np.ndarray, y: np.ndarray, seed: int = 42) -> np.ndarray:
        """Generate Perlin-like noise"""
        np.random.seed(seed)
        phases = np.random.random(8) * 2 * np.pi

        result = np.zeros_like(x)
        for i in range(4):
            angle = i * np.pi / 4 + phases[i]
            freq = 1 + phases[i + 4] * 0.5
            result += np.sin(freq * (x * np.cos(angle) + y * np.sin(angle)) + phases[i])

        return result / 4

    def _estimate_elevation_range(self, lat: float, lon: float) -> Tuple[float, float]:
        """Estimate base elevation and range based on coordinates"""
        # Alps
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
        # Coastal
        if lat < 44.0 and lon > 3.0:
            return 50, 500
        # Default
        return 100, 300
