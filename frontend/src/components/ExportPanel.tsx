import { Download, Loader2, FileDown, Clock, Cpu } from 'lucide-react';
import type { TerrainSettings } from '../hooks/useTerrain';

interface ExportPanelProps {
  canExport: boolean;
  isExporting: boolean;
  settings: TerrainSettings;
  onExport: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function estimateTriangles(resolution: number, addBase: boolean): number {
  const terrainTris = 2 * (resolution - 1) ** 2;
  if (!addBase) return terrainTris;
  const baseTris = terrainTris;
  const sideTris = 4 * 2 * (resolution - 1);
  return terrainTris + baseTris + sideTris;
}

function estimateFileSize(resolution: number, addBase: boolean): number {
  const triangles = estimateTriangles(resolution, addBase);
  return 84 + triangles * 50;
}

export default function ExportPanel({
  canExport,
  isExporting,
  settings,
  onExport,
}: ExportPanelProps) {
  const triangles = estimateTriangles(settings.resolution, settings.addBase);
  const fileSize = estimateFileSize(settings.resolution, settings.addBase);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
        <FileDown className="w-4 h-4" />
        Export STL
      </h3>

      {/* Estimates */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-slate-700/50 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Cpu className="w-3 h-3" />
            Triangles
          </div>
          <p className="text-lg font-mono text-white">
            {triangles.toLocaleString()}
          </p>
        </div>

        <div className="p-3 bg-slate-700/50 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <FileDown className="w-3 h-3" />
            Taille fichier
          </div>
          <p className="text-lg font-mono text-white">
            {formatFileSize(fileSize)}
          </p>
        </div>
      </div>

      {/* Print time estimate */}
      <div className="p-3 bg-slate-700/50 rounded-lg">
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
          <Clock className="w-3 h-3" />
          Temps d'impression estimé (100mm)
        </div>
        <p className="text-sm text-white">
          ~{Math.round(2 * (settings.resolution / 128) ** 2)} heures
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Estimation pour couche 0.2mm, remplissage 20%
        </p>
      </div>

      {/* Export button */}
      <button
        onClick={onExport}
        disabled={!canExport || isExporting}
        className={`
          w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2
          transition-all duration-200
          ${
            canExport && !isExporting
              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25'
              : 'bg-slate-700 text-slate-400 cursor-not-allowed'
          }
        `}
      >
        {isExporting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Génération en cours...
          </>
        ) : (
          <>
            <Download className="w-5 h-5" />
            Télécharger STL
          </>
        )}
      </button>

      {!canExport && (
        <p className="text-xs text-center text-slate-500">
          Sélectionnez et générez un terrain pour exporter
        </p>
      )}
    </div>
  );
}
