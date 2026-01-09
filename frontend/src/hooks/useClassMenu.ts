/**
 * 班級菜單 Hook
 * 基於 classId 獲取菜單資料
 */

import { useState, useEffect } from 'react';
import { getClassMenu, getClassTrending } from '../services/classApi';
import type { MenuItem, SystemConfig } from '../types';

interface UseClassMenuResult {
    menuItems: MenuItem[];
    trendingItems: string[];
    systemConfig: SystemConfig | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useClassMenu(classId: string | null): UseClassMenuResult {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [trendingItems, setTrendingItems] = useState<string[]>([]);
    const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        if (!classId) {
            setError('未指定班級');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const [menuResult, trendingResult] = await Promise.all([
                getClassMenu(classId),
                getClassTrending(classId)
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
    }, [classId]);

    return {
        menuItems,
        trendingItems,
        systemConfig,
        isLoading,
        error,
        refetch: fetchData
    };
}
