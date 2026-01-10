/**
 * @deprecated 此 Hook 已棄用，請改用 useClassOrders
 * @see useClassOrders - 支援多班級的訂單載入 Hook
 * 
 * 舊版 Hook，使用全局 API，不支援多班級系統。
 * 將在 v4.0.0 移除。
 */
import { useState, useEffect, useCallback } from 'react';
import { subscribeToOrders, getOrders } from '../services/api';
import type { Order } from '../types';


interface UseOrdersResult {
    orders: Order[];
    preparingOrders: Order[];
    completedOrders: Order[];
    pendingCount: number;
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useOrders(realtime: boolean = true): UseOrdersResult {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchOrders = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await getOrders();
            if (result.status === 'success') {
                setOrders(result.data || []);
            } else {
                setError(result.message || 'Failed to load orders');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (realtime) {
            // 即時訂閱
            const unsubscribe = subscribeToOrders((newOrders) => {
                setOrders(newOrders);
                setIsLoading(false);
            });
            return unsubscribe;
        } else {
            // 一次性獲取
            fetchOrders();
        }
    }, [realtime, fetchOrders]);

    const preparingOrders = orders.filter(o =>
        o.status === 'Preparing' || o.status === 'Pending'
    );

    const completedOrders = orders.filter(o => o.status === 'Completed');

    const pendingCount = orders.filter(o => o.status === 'Pending').length;

    return {
        orders,
        preparingOrders,
        completedOrders,
        pendingCount,
        isLoading,
        error,
        refetch: fetchOrders
    };
}
