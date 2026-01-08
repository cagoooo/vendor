import { useState, useEffect } from 'react';
import { getMenu, getTrending } from '../services/api';
import type { MenuItem, SystemConfig } from '../types';

interface UseMenuResult {
    menuItems: MenuItem[];
    trendingItems: string[];
    systemConfig: SystemConfig | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useMenu(): UseMenuResult {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [trendingItems, setTrendingItems] = useState<string[]>([]);
    const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const [menuResult, trendingResult] = await Promise.all([
                getMenu(),
                getTrending()
            ]);

            if (menuResult.status === 'success') {
                setMenuItems(menuResult.data || []);
                setSystemConfig(menuResult.system || null);
            } else {
                setError(menuResult.message || 'Failed to load menu');
            }

            if (trendingResult.status === 'success') {
                setTrendingItems(trendingResult.data || []);
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return {
        menuItems,
        trendingItems,
        systemConfig,
        isLoading,
        error,
        refetch: fetchData
    };
}
