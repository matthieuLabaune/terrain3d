import { Settings, Layers, Box, Maximize2 } from 'lucide-react';
import type { TerrainSettings } from '../hooks/useTerrain';

interface ControlsProps {
  settings: TerrainSettings;
  onSettingsChange: (updates: Partial<TerrainSettings>) => void;
  wireframe: boolean;
  onWireframeChange: (value: boolean) => void;
  autoRotate: boolean;
  onAutoRotateChange: (value: boolean) => void;
}

export default function Controls({
  settings,
  onSettingsChange,
  wireframe,
  onWireframeChange,
  autoRotate,
  onAutoRotateChange,
}: ControlsProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
        <Settings className="w-4 h-4" />
        Paramètres
      </h3>

      {/* Resolution */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Résolution</span>
          <span className="text-white font-mono">{settings.resolution}px</span>
        </div>
        <input
          type="range"
          min="64"
          max="256"
          step="32"
          value={settings.resolution}
          onChange={(e) => onSettingsChange({ resolution: parseInt(e.target.value) })}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                     accent-blue-500"
        />
        <div className="flex justify-between text-xs text-slate-500">
          <span>64</span>
          <span>256</span>
        </div>
      </div>

      {/* Height Exaggeration */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400 flex items-center gap-1">
            <Layers className="w-3 h-3" />
            Exagération hauteur
          </span>
          <span className="text-white font-mono">{settings.heightExaggeration.toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min="0.5"
          max="3"
          step="0.1"
          value={settings.heightExaggeration}
          onChange={(e) => onSettingsChange({ heightExaggeration: parseFloat(e.target.value) })}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                     accent-blue-500"
        />
      </div>

      {/* Scale Z for STL */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400 flex items-center gap-1">
            <Maximize2 className="w-3 h-3" />
            Échelle Z (STL)
          </span>
          <span className="text-white font-mono">{settings.scaleZ.toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min="0.5"
          max="3"
          step="0.1"
          value={settings.scaleZ}
          onChange={(e) => onSettingsChange({ scaleZ: parseFloat(e.target.value) })}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                     accent-blue-500"
        />
      </div>

      {/* Base options */}
      <div className="space-y-3 pt-2 border-t border-slate-700">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.addBase}
            onChange={(e) => onSettingsChange({ addBase: e.target.checked })}
            className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-blue-500 
                       focus:ring-blue-500 focus:ring-offset-slate-800"
          />
          <span className="text-sm text-slate-300 flex items-center gap-1">
            <Box className="w-3 h-3" />
            Ajouter socle
          </span>
        </label>

        {settings.addBase && (
          <div className="space-y-2 pl-7">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Épaisseur socle</span>
              <span className="text-white font-mono">{settings.baseThickness}mm</span>
            </div>
            <input
              type="range"
              min="2"
              max="15"
              step="1"
              value={settings.baseThickness}
              onChange={(e) => onSettingsChange({ baseThickness: parseFloat(e.target.value) })}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                         accent-blue-500"
            />
          </div>
        )}
      </div>

      {/* View options */}
      <div className="space-y-3 pt-2 border-t border-slate-700">
        <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          Affichage
        </h4>
        
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={wireframe}
            onChange={(e) => onWireframeChange(e.target.checked)}
            className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-blue-500 
                       focus:ring-blue-500 focus:ring-offset-slate-800"
          />
          <span className="text-sm text-slate-300">Mode filaire</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={autoRotate}
            onChange={(e) => onAutoRotateChange(e.target.checked)}
            className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-blue-500 
                       focus:ring-blue-500 focus:ring-offset-slate-800"
          />
          <span className="text-sm text-slate-300">Rotation auto</span>
        </label>
      </div>
    </div>
  );
}
