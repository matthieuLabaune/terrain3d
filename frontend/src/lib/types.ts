// API Types

export interface BBox {
    lat_min: number;
    lat_max: number;
    lon_min: number;
    lon_max: number;
}

export interface Region {
    id: string;
    name: string;
    bbox: BBox;
    default_resolution: number;
    elevation_range: [number, number];
    data_sources: string[];
    description?: string;
}

export interface RegionsResponse {
    regions: Region[];
}

export interface TerrainMetadata {
    center_lat: number;
    center_lon: number;
    min_elevation: number;
    max_elevation: number;
    data_source: string;
    timestamp: string;
    resolution: number;
}

export interface TerrainRequest {
    region?: string;
    bbox?: BBox;
    resolution: number;
    height_exaggeration: number;
    data_source: string;
}

export interface TerrainResponse {
    id: string;
    heightmap: number[][];
    metadata: TerrainMetadata;
    bounds: BBox;
}

export interface ExportSTLRequest {
    terrain_id: string;
    resolution: number;
    scale_xy: number;
    scale_z: number;
    add_base: boolean;
    base_thickness: number;
}

export interface EstimateResponse {
    file_size_bytes: number;
    file_size_mb: number;
    estimated_triangles: number;
    estimated_print_time: string;
}
