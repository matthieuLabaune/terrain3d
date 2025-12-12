import { MapPin, Mountain, Info } from 'lucide-react';
import type { Region } from '../lib/types';

interface RegionSelectorProps {
    regions: Region[];
    selectedRegion: Region | null;
    onSelect: (region: Region) => void;
    isLoading?: boolean;
}

export default function RegionSelector({
    regions,
    selectedRegion,
    onSelect,
    isLoading = false,
}: RegionSelectorProps) {
    if (isLoading) {
        return (
            <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                    Chargement des régions...
                </label>
                <div className="animate-pulse bg-slate-700 h-10 rounded-lg" />
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-300">
                <MapPin className="inline-block w-4 h-4 mr-1" />
                Région
            </label>

            <select
                value={selectedRegion?.id || ''}
                onChange={(e) => {
                    const region = regions.find((r) => r.id === e.target.value);
                    if (region) onSelect(region);
                }}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg
                   text-white focus:outline-none focus:ring-2 focus:ring-blue-500
                   cursor-pointer"
            >
                <option value="">Sélectionner une région...</option>
                {regions.map((region) => (
                    <option key={region.id} value={region.id}>
                        {region.name}
                    </option>
                ))}
            </select>

            {selectedRegion && (
                <div className="p-3 bg-slate-700/50 rounded-lg border border-slate-600 space-y-2">
                    <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-slate-300">{selectedRegion.description}</p>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Mountain className="w-3 h-3" />
                        <span>
                            Altitude: {selectedRegion.elevation_range[0]}m - {selectedRegion.elevation_range[1]}m
                        </span>
                    </div>

                    <div className="text-xs text-slate-500">
                        Coordonnées: {selectedRegion.bbox.lat_min.toFixed(2)}°N, {selectedRegion.bbox.lon_min.toFixed(2)}°E
                    </div>
                </div>
            )}
        </div>
    );
}
