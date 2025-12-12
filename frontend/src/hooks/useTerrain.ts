import { useState, useCallback } from 'react';
import type { Region, TerrainResponse } from '../lib/types';
import { generateTerrain, exportSTL } from '../lib/api';

export interface LoadingProgress {
    current: number;
    total: number;
    message?: string;
}

export interface TerrainState {
    terrain: TerrainResponse | null;
    isLoading: boolean;
    isExporting: boolean;
    error: string | null;
    progress: LoadingProgress | null;
}

export interface TerrainSettings {
    resolution: number;
    heightExaggeration: number;
    scaleXY: number;
    scaleZ: number;
    addBase: boolean;
    baseThickness: number;
}

export function useTerrain() {
    const [state, setState] = useState<TerrainState>({
        terrain: null,
        isLoading: false,
        isExporting: false,
        error: null,
        progress: null,
    });

    const [settings, setSettings] = useState<TerrainSettings>({
        resolution: 128,
        heightExaggeration: 1.5,
        scaleXY: 1.0,
        scaleZ: 1.5,
        addBase: true,
        baseThickness: 5.0,
    });

    const loadTerrain = useCallback(async (region: Region) => {
        // Calculate total batches based on resolution
        const totalPoints = settings.resolution * settings.resolution;
        const batchSize = 500;
        const totalBatches = Math.ceil(totalPoints / batchSize);

        setState((prev) => ({
            ...prev,
            isLoading: true,
            error: null,
            progress: {
                current: 0,
                total: totalBatches,
                message: "Connexion au serveur d'élévation...",
            },
        }));

        // Simulate progress updates while waiting for the API
        // (real progress would require SSE/WebSocket from backend)
        let currentBatch = 0;
        const progressInterval = setInterval(() => {
            currentBatch++;
            if (currentBatch <= totalBatches) {
                setState((prev) => ({
                    ...prev,
                    progress: {
                        current: currentBatch,
                        total: totalBatches,
                        message: `Téléchargement des données SRTM...`,
                    },
                }));
            }
        }, 600); // ~600ms per batch (matching API rate limit)

        try {
            const terrain = await generateTerrain({
                region: region.id,
                resolution: settings.resolution,
                height_exaggeration: settings.heightExaggeration,
                data_source: 'srtm',
            });

            clearInterval(progressInterval);

            setState((prev) => ({
                ...prev,
                terrain,
                isLoading: false,
                progress: null,
            }));
        } catch (err) {
            clearInterval(progressInterval);
            const message = err instanceof Error ? err.message : 'Failed to load terrain';
            setState((prev) => ({
                ...prev,
                isLoading: false,
                progress: null,
                error: message,
            }));
        }
    }, [settings.resolution, settings.heightExaggeration]);

    const downloadSTL = useCallback(async () => {
        if (!state.terrain) return;

        setState((prev) => ({
            ...prev,
            isExporting: true,
            error: null,
            progress: {
                current: 0,
                total: 2,
                message: "Génération du modèle 3D...",
            },
        }));

        // Simulate STL generation progress
        setTimeout(() => {
            setState((prev) => ({
                ...prev,
                progress: {
                    current: 1,
                    total: 2,
                    message: "Création du mesh watertight...",
                },
            }));
        }, 500);

        try {
            const blob = await exportSTL({
                terrain_id: state.terrain.id,
                resolution: settings.resolution,
                scale_xy: settings.scaleXY,
                scale_z: settings.scaleZ,
                add_base: settings.addBase,
                base_thickness: settings.baseThickness,
            });

            // Create download link
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `terrain_${state.terrain.id.slice(0, 8)}.stl`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setState((prev) => ({
                ...prev,
                isExporting: false,
                progress: null,
            }));
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to export STL';
            setState((prev) => ({
                ...prev,
                isExporting: false,
                progress: null,
                error: message,
            }));
        }
    }, [state.terrain, settings]);

    const updateSettings = useCallback((updates: Partial<TerrainSettings>) => {
        setSettings((prev) => ({ ...prev, ...updates }));
    }, []);

    const clearError = useCallback(() => {
        setState((prev) => ({ ...prev, error: null }));
    }, []);

    return {
        ...state,
        settings,
        loadTerrain,
        downloadSTL,
        updateSettings,
        clearError,
    };
}
