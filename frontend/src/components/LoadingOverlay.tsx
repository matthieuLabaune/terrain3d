import { Mountain } from 'lucide-react';

interface LoadingOverlayProps {
    isVisible: boolean;
    progress?: {
        current: number;
        total: number;
        message?: string;
    };
    title?: string;
}

export default function LoadingOverlay({
    isVisible,
    progress,
    title = "Génération du terrain en cours..."
}: LoadingOverlayProps) {
    if (!isVisible) return null;

    const percentage = progress
        ? Math.round((progress.current / progress.total) * 100)
        : null;

    return (
        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center z-50">
            {/* Animated terrain icon */}
            <div className="relative mb-8">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-blue-500/30 rounded-full blur-xl animate-pulse" />
                
                {/* Rotating container */}
                <div className="relative animate-spin-slow">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center shadow-2xl transform rotate-12">
                        <Mountain className="w-12 h-12 text-white" />
                    </div>
                </div>
                
                {/* Orbiting dots */}
                <div className="absolute inset-0 animate-spin-slow" style={{ animationDuration: '3s' }}>
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-blue-400 rounded-full" />
                </div>
                <div className="absolute inset-0 animate-spin-slow" style={{ animationDuration: '4s', animationDirection: 'reverse' }}>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-green-400 rounded-full" />
                </div>
            </div>

            {/* Title */}
            <h3 className="text-xl font-semibold text-white mb-2">
                {title}
            </h3>

            {/* Progress bar */}
            {progress && (
                <div className="w-64 mb-4">
                    <div className="flex justify-between text-sm text-slate-400 mb-2">
                        <span>Téléchargement des données</span>
                        <span>{progress.current} / {progress.total}</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                    {percentage !== null && (
                        <div className="text-center text-sm text-slate-400 mt-2">
                            {percentage}%
                        </div>
                    )}
                </div>
            )}

            {/* Progress message */}
            {progress?.message && (
                <p className="text-slate-400 text-sm mb-4">
                    {progress.message}
                </p>
            )}

            {/* Warning message */}
            <div className="mt-6 px-6 py-4 bg-amber-900/30 border border-amber-700/50 rounded-lg max-w-md text-center">
                <p className="text-amber-200 text-sm">
                    ⚠️ <strong>Merci de patienter</strong>
                </p>
                <p className="text-amber-300/70 text-xs mt-1">
                    Ne fermez pas et ne rafraîchissez pas cette page pendant le téléchargement des données d'élévation.
                </p>
            </div>

            {/* Estimated time */}
            {progress && progress.total > 0 && (
                <p className="text-slate-500 text-xs mt-4">
                    Temps estimé : {Math.ceil((progress.total - progress.current) * 0.6)} secondes restantes
                </p>
            )}
        </div>
    );
}
