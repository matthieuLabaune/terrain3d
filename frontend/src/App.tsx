import { useState } from 'react';
import { Mountain, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import TerrainViewer from './components/TerrainViewer';
import RegionSelector from './components/RegionSelector';
import Controls from './components/Controls';
import ExportPanel from './components/ExportPanel';
import MetadataPanel from './components/MetadataPanel';
import { useRegions } from './hooks/useRegions';
import { useTerrain } from './hooks/useTerrain';
import type { Region } from './lib/types';

export default function App() {
    const { regions, isLoading: regionsLoading, error: regionsError } = useRegions();
    const {
        terrain,
        isLoading: terrainLoading,
        isExporting,
        error: terrainError,
        settings,
        loadTerrain,
        downloadSTL,
        updateSettings,
        clearError,
    } = useTerrain();

    const [selectedRegion, setSelectedRegion] = useState<Region | null>(null);
    const [wireframe, setWireframe] = useState(false);
    const [autoRotate, setAutoRotate] = useState(false);

    const handleRegionSelect = (region: Region) => {
        setSelectedRegion(region);
        loadTerrain(region);
    };

    const handleRegenerate = () => {
        if (selectedRegion) {
            loadTerrain(selectedRegion);
        }
    };

    const error = regionsError || terrainError;

    return (
        <div className="h-screen flex flex-col bg-slate-900">
            {/* Header */}
            <header className="px-6 py-4 bg-slate-800 border-b border-slate-700">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-lg">
                            <Mountain className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">Terrain3D</h1>
                            <p className="text-sm text-slate-400">
                                Modèles 3D imprimables de la France
                            </p>
                        </div>
                    </div>

                    <div className="text-sm text-slate-400">
                        {regions.length} régions disponibles
                    </div>
                </div>
            </header>

            {/* Error banner */}
            {error && (
                <div className="px-6 py-3 bg-red-900/50 border-b border-red-800 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-red-200">
                        <AlertCircle className="w-5 h-5" />
                        <span>{error}</span>
                    </div>
                    <button
                        onClick={clearError}
                        className="text-red-300 hover:text-red-100 text-sm"
                    >
                        Fermer
                    </button>
                </div>
            )}

            {/* Main content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left sidebar */}
                <aside className="w-80 bg-slate-800 border-r border-slate-700 flex flex-col overflow-y-auto">
                    <div className="p-4 space-y-6">
                        {/* Region selection */}
                        <RegionSelector
                            regions={regions}
                            selectedRegion={selectedRegion}
                            onSelect={handleRegionSelect}
                            isLoading={regionsLoading}
                        />

                        {/* Generate button */}
                        {selectedRegion && (
                            <button
                                onClick={handleRegenerate}
                                disabled={terrainLoading}
                                className={`
                  w-full py-2.5 px-4 rounded-lg font-medium flex items-center justify-center gap-2
                  transition-all duration-200
                  ${terrainLoading
                                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                    }
                `}
                            >
                                {terrainLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Génération...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="w-5 h-5" />
                                        Régénérer
                                    </>
                                )}
                            </button>
                        )}

                        {/* Controls */}
                        <Controls
                            settings={settings}
                            onSettingsChange={updateSettings}
                            wireframe={wireframe}
                            onWireframeChange={setWireframe}
                            autoRotate={autoRotate}
                            onAutoRotateChange={setAutoRotate}
                        />
                    </div>
                </aside>

                {/* 3D Viewer */}
                <main className="flex-1 relative bg-slate-900">
                    {terrainLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-10">
                            <div className="text-center">
                                <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto" />
                                <p className="mt-4 text-slate-300">Génération du terrain...</p>
                                <p className="text-sm text-slate-500">
                                    Téléchargement des données d'élévation
                                </p>
                            </div>
                        </div>
                    )}

                    <TerrainViewer
                        heightmap={terrain?.heightmap || null}
                        wireframe={wireframe}
                        autoRotate={autoRotate}
                    />

                    {/* Metadata overlay */}
                    {terrain && (
                        <div className="absolute bottom-4 left-4">
                            <MetadataPanel
                                metadata={terrain.metadata}
                                regionName={selectedRegion?.name}
                            />
                        </div>
                    )}
                </main>

                {/* Right sidebar */}
                <aside className="w-72 bg-slate-800 border-l border-slate-700 p-4 overflow-y-auto">
                    <ExportPanel
                        canExport={!!terrain}
                        isExporting={isExporting}
                        settings={settings}
                        onExport={downloadSTL}
                    />

                    {/* Tips */}
                    <div className="mt-6 p-4 bg-slate-700/50 rounded-lg">
                        <h4 className="text-sm font-medium text-slate-300 mb-2">
                            💡 Conseils d'impression
                        </h4>
                        <ul className="text-xs text-slate-400 space-y-1.5">
                            <li>• Commencez avec une résolution de 128 pour tester</li>
                            <li>• L'exagération de hauteur aide à voir les détails</li>
                            <li>• Le socle rend l'impression plus stable</li>
                            <li>• Utilisez 20% de remplissage pour économiser du filament</li>
                        </ul>
                    </div>
                </aside>
            </div>
        </div>
    );
}
