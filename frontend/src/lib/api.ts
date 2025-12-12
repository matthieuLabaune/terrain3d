import type {
    RegionsResponse,
    TerrainRequest,
    TerrainResponse,
    ExportSTLRequest,
    EstimateResponse,
} from './types';

const API_BASE = '/api';

class APIError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'APIError';
    }
}

async function fetchAPI<T>(
    endpoint: string,
    options?: RequestInit
): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new APIError(response.status, error.detail || 'Request failed');
    }

    return response.json();
}

export async function getRegions(): Promise<RegionsResponse> {
    return fetchAPI<RegionsResponse>('/list-locations');
}

export async function generateTerrain(
    request: TerrainRequest
): Promise<TerrainResponse> {
    return fetchAPI<TerrainResponse>('/terrain', {
        method: 'POST',
        body: JSON.stringify(request),
    });
}

export async function exportSTL(request: ExportSTLRequest): Promise<Blob> {
    const response = await fetch(`${API_BASE}/export-stl`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new APIError(response.status, error.detail || 'Export failed');
    }

    return response.blob();
}

export async function getEstimate(
    resolution: number,
    addBase: boolean,
    scale: number
): Promise<EstimateResponse> {
    const params = new URLSearchParams({
        resolution: resolution.toString(),
        add_base: addBase.toString(),
        scale: scale.toString(),
    });
    return fetchAPI<EstimateResponse>(`/estimate?${params}`);
}

export async function healthCheck(): Promise<{ status: string }> {
    return fetchAPI('/health');
}
