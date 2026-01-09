/**
 * 班級訂單 Hook
 * 基於 classId 訂閱訂單資料
 */

import { useState, useEffect, useCallback } from 'react';
import { subscribeToClassOrders, getClassOrders } from '../services/classApi';
import type { Order } from '../types';

export function useClassOrders(classId: string | null, subscribe: boolean = true) {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refetch = useCallback(async () => {
        if (!classId) return;

        setLoading(true);
        try {
            const result = await getClassOrders(classId);
            if (result.status === 'success' && result.data) {
                setOrders(result.data);
                setError(null);
            } else {
                setError(result.message || 'Failed to fetch orders');
            }
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }, [classId]);

    useEffect(() => {
        if (!classId) {
            setOrders([]);
            setLoading(false);
            return;
        }

        if (subscribe) {
            setLoading(true);
            const unsubscribe = subscribeToClassOrders(classId, (newOrders) => {
                setOrders(newOrders);
                setLoading(false);
            });
            return () => unsubscribe();
        } else {
            refetch();
        }
    }, [classId, subscribe, refetch]);

    const pendingCount = orders.filter(o => o.status === 'Pending').length;

    return {
        orders,
        loading,
        error,
        pendingCount,
        refetch
    };
}
