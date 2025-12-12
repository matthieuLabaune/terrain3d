import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Rectangle, useMapEvents } from 'react-leaflet';
import { LatLngBounds, LatLng } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Map, Square, Printer } from 'lucide-react';

interface BBox {
    lat_min: number;
    lat_max: number;
    lon_min: number;
    lon_max: number;
}

interface CustomAreaSelectorProps {
    onBBoxSelect: (bbox: BBox) => void;
    printBedSize?: { x: number; y: number }; // in cm
    isLoading?: boolean;
}

// Preset printer bed sizes
const PRINTER_PRESETS = [
    { name: 'Bambu Lab A1', x: 25, y: 25 },
    { name: 'Bambu Lab A1 Mini', x: 18, y: 18 },
    { name: 'Bambu Lab P1S', x: 25, y: 25 },
    { name: 'Bambu Lab X1', x: 25, y: 25 },
    { name: 'Prusa MK4', x: 25, y: 21 },
    { name: 'Ender 3', x: 22, y: 22 },
    { name: 'Custom', x: 20, y: 20 },
];

function DrawRectangle({
    onBoundsChange,
    aspectRatio,
}: {
    onBoundsChange: (bounds: LatLngBounds | null) => void;
    aspectRatio: number;
}) {
    const [drawing, setDrawing] = useState(false);
    const [startPoint, setStartPoint] = useState<LatLng | null>(null);
    const [bounds, setBounds] = useState<LatLngBounds | null>(null);

    useMapEvents({
        mousedown(e) {
            if (e.originalEvent.shiftKey) {
                setDrawing(true);
                setStartPoint(e.latlng);
                setBounds(null);
            }
        },
        mousemove(e) {
            if (drawing && startPoint) {
                const latDiff = e.latlng.lat - startPoint.lat;
                // Adjust longitude based on aspect ratio
                const lngDiff = latDiff * aspectRatio;
                
                const newBounds = new LatLngBounds(
                    startPoint,
                    new LatLng(
                        startPoint.lat + latDiff,
                        startPoint.lng + lngDiff
                    )
                );
                setBounds(newBounds);
            }
        },
        mouseup() {
            if (drawing && bounds) {
                setDrawing(false);
                onBoundsChange(bounds);
            }
        },
    });

    return bounds ? (
        <Rectangle
            bounds={bounds}
            pathOptions={{
                color: '#3b82f6',
                weight: 2,
                fillColor: '#3b82f6',
                fillOpacity: 0.2,
            }}
        />
    ) : null;
}

export default function CustomAreaSelector({
    onBBoxSelect,
    printBedSize = { x: 25, y: 25 },
    isLoading = false,
}: CustomAreaSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedPreset, setSelectedPreset] = useState(PRINTER_PRESETS[0]);
    const [customSize, setCustomSize] = useState({ x: 25, y: 25 });
    const [selectedBounds, setSelectedBounds] = useState<LatLngBounds | null>(null);
    const [scale, setScale] = useState(1); // km per cm on print

    const bedSize = selectedPreset.name === 'Custom' ? customSize : selectedPreset;
    const aspectRatio = bedSize.x / bedSize.y;

    // Calculate real-world coverage
    const realWorldWidth = bedSize.x * scale; // km
    const realWorldHeight = bedSize.y * scale; // km

    const handleBoundsChange = useCallback((bounds: LatLngBounds | null) => {
        setSelectedBounds(bounds);
    }, []);

    const handleGenerate = () => {
        if (selectedBounds) {
            const bbox: BBox = {
                lat_min: selectedBounds.getSouth(),
                lat_max: selectedBounds.getNorth(),
                lon_min: selectedBounds.getWest(),
                lon_max: selectedBounds.getEast(),
            };
            onBBoxSelect(bbox);
            setIsOpen(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="w-full py-2.5 px-4 rounded-lg font-medium flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white transition-all duration-200"
            >
                <Map className="w-5 h-5" />
                Zone personnalisee
            </button>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Map className="w-6 h-6 text-purple-400" />
                        Selectionner une zone personnalisee
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                        Maintenez Shift + cliquez-glissez pour dessiner un rectangle
                    </p>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Map */}
                    <div className="flex-1 relative">
                        <MapContainer
                            center={[46.2, 2.2]}
                            zoom={6}
                            className="w-full h-full"
                            style={{ minHeight: '400px' }}
                        >
                            <TileLayer
                                attribution='&copy; OpenStreetMap'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <DrawRectangle
                                onBoundsChange={handleBoundsChange}
                                aspectRatio={aspectRatio}
                            />
                            {selectedBounds && (
                                <Rectangle
                                    bounds={selectedBounds}
                                    pathOptions={{
                                        color: '#22c55e',
                                        weight: 3,
                                        fillColor: '#22c55e',
                                        fillOpacity: 0.3,
                                    }}
                                />
                            )}
                        </MapContainer>
                    </div>

                    {/* Sidebar */}
                    <div className="w-72 bg-slate-900 p-4 overflow-y-auto">
                        {/* Printer preset */}
                        <div className="mb-4">
                            <label className="text-sm font-medium text-slate-300 mb-2 block">
                                <Printer className="w-4 h-4 inline mr-2" />
                                Imprimante 3D
                            </label>
                            <select
                                value={selectedPreset.name}
                                onChange={(e) => {
                                    const preset = PRINTER_PRESETS.find(p => p.name === e.target.value);
                                    if (preset) setSelectedPreset(preset);
                                }}
                                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm"
                            >
                                {PRINTER_PRESETS.map(preset => (
                                    <option key={preset.name} value={preset.name}>
                                        {preset.name} ({preset.x}x{preset.y} cm)
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Custom size */}
                        {selectedPreset.name === 'Custom' && (
                            <div className="mb-4 grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs text-slate-400">Largeur (cm)</label>
                                    <input
                                        type="number"
                                        value={customSize.x}
                                        onChange={(e) => setCustomSize(s => ({ ...s, x: Number(e.target.value) }))}
                                        className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400">Profondeur (cm)</label>
                                    <input
                                        type="number"
                                        value={customSize.y}
                                        onChange={(e) => setCustomSize(s => ({ ...s, y: Number(e.target.value) }))}
                                        className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Scale */}
                        <div className="mb-4">
                            <label className="text-sm font-medium text-slate-300 mb-2 block">
                                Echelle: 1 cm = {scale} km
                            </label>
                            <input
                                type="range"
                                min="0.1"
                                max="5"
                                step="0.1"
                                value={scale}
                                onChange={(e) => setScale(Number(e.target.value))}
                                className="w-full"
                            />
                            <div className="text-xs text-slate-500 mt-1">
                                Zone reelle: {realWorldWidth.toFixed(1)} x {realWorldHeight.toFixed(1)} km
                            </div>
                        </div>

                        {/* Info */}
                        <div className="p-3 bg-slate-800 rounded-lg mb-4">
                            <h4 className="text-sm font-medium text-slate-300 mb-2">
                                <Square className="w-4 h-4 inline mr-2" />
                                Zone selectionnee
                            </h4>
                            {selectedBounds ? (
                                <div className="text-xs text-slate-400 space-y-1">
                                    <div>Nord: {selectedBounds.getNorth().toFixed(4)}</div>
                                    <div>Sud: {selectedBounds.getSouth().toFixed(4)}</div>
                                    <div>Est: {selectedBounds.getEast().toFixed(4)}</div>
                                    <div>Ouest: {selectedBounds.getWest().toFixed(4)}</div>
                                </div>
                            ) : (
                                <p className="text-xs text-slate-500">
                                    Aucune zone selectionnee
                                </p>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="space-y-2">
                            <button
                                onClick={handleGenerate}
                                disabled={!selectedBounds || isLoading}
                                className="w-full py-2.5 px-4 rounded-lg font-medium bg-green-600 hover:bg-green-500 text-white disabled:bg-slate-700 disabled:text-slate-500 transition-all"
                            >
                                Generer le terrain
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="w-full py-2 px-4 rounded-lg font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 transition-all"
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
