import { useState, useCallback } from 'react';
import type { Region, TerrainResponse } from '../lib/types';
import { generateTerrain, exportSTL } from '../lib/api';

export interface TerrainState {
  terrain: TerrainResponse | null;
  isLoading: boolean;
  isExporting: boolean;
  error: string | null;
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
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const terrain = await generateTerrain({
        region: region.id,
        resolution: settings.resolution,
        height_exaggeration: settings.heightExaggeration,
        data_source: 'srtm',
      });

      setState((prev) => ({
        ...prev,
        terrain,
        isLoading: false,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load terrain';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
    }
  }, [settings.resolution, settings.heightExaggeration]);

  const downloadSTL = useCallback(async () => {
    if (!state.terrain) return;

    setState((prev) => ({ ...prev, isExporting: true, error: null }));

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

      setState((prev) => ({ ...prev, isExporting: false }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export STL';
      setState((prev) => ({
        ...prev,
        isExporting: false,
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
