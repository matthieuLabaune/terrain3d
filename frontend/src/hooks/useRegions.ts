import { useState, useEffect } from 'react';
import type { Region } from '../lib/types';
import { getRegions } from '../lib/api';

export function useRegions() {
    const [regions, setRegions] = useState<Region[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchRegions() {
            try {
                const response = await getRegions();
                setRegions(response.regions);
                setError(null);
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to load regions';
                setError(message);
            } finally {
                setIsLoading(false);
            }
        }

        fetchRegions();
    }, []);

    return { regions, isLoading, error };
}
