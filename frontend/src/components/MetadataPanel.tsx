import { Mountain, ArrowRight, MapPin } from 'lucide-react';
import type { TerrainMetadata } from '../lib/types';

interface MetadataPanelProps {
    metadata: TerrainMetadata | null;
    regionName?: string;
}

export default function MetadataPanel({ metadata, regionName }: MetadataPanelProps) {
    if (!metadata) return null;

    return (
        <div className="p-4 bg-slate-800/80 rounded-lg border border-slate-700 space-y-3">
            <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Mountain className="w-4 h-4" />
                {regionName || 'Terrain généré'}
            </h3>

            <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">
                        Altitude min
                    </p>
                    <p className="text-white font-mono">
                        {Math.round(metadata.min_elevation)}m
                    </p>
                </div>

                <div>
                    <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">
                        Altitude max
                    </p>
                    <p className="text-white font-mono">
                        {Math.round(metadata.max_elevation)}m
                    </p>
                </div>

                <div>
                    <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">
                        Dénivelé
                    </p>
                    <p className="text-white font-mono flex items-center gap-1">
                        <ArrowRight className="w-3 h-3 rotate-90" />
                        {Math.round(metadata.max_elevation - metadata.min_elevation)}m
                    </p>
                </div>

                <div>
                    <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">
                        Résolution
                    </p>
                    <p className="text-white font-mono">
                        {metadata.resolution}×{metadata.resolution}
                    </p>
                </div>
            </div>

            <div className="pt-2 border-t border-slate-700">
                <p className="text-xs text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {metadata.center_lat.toFixed(4)}°N, {metadata.center_lon.toFixed(4)}°E
                </p>
                <p className="text-xs text-slate-500 mt-1">
                    Source: {metadata.data_source.toUpperCase()}
                </p>
            </div>
        </div>
    );
}
