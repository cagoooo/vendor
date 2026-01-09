/**
 * Owner 專用 API - 查看所有班級統計
 */

import {
    collection,
    doc,
    getDocs,
    getDoc,
    query,
    where
} from 'firebase/firestore';
import { db } from './firebase';
import type { ApiResponse } from '../types';

export interface KitchenStats {
    classId: string;
    className: string;
    ownerName: string;
    isOpen: boolean;
    waitTime: number;
    todayRevenue: number;
    todayOrderCount: number;
    pendingOrderCount: number;
    preparingOrderCount: number;
    completedOrderCount: number;
}

export interface AllKitchensStats {
    kitchens: KitchenStats[];
    totalRevenue: number;
    totalOrderCount: number;
    activeKitchens: number;
}

// 取得所有班級廚房的統計資料
export async function getAllKitchensStats(): Promise<ApiResponse<AllKitchensStats>> {
    try {
        // 取得所有班級廚房
        const kitchensSnapshot = await getDocs(collection(db, 'kitchens'));
        const today = new Date().toISOString().slice(0, 10);

        const kitchensStats: KitchenStats[] = [];
        let totalRevenue = 0;
        let totalOrderCount = 0;
        let activeKitchens = 0;

        for (const kitchenDoc of kitchensSnapshot.docs) {
            const kitchenData = kitchenDoc.data();
            const classId = kitchenDoc.id;

            // 取得系統設定
            let isOpen = true;
            let waitTime = 15;
            try {
                const configDoc = await getDoc(doc(db, `kitchens/${classId}/system`, 'config'));
                if (configDoc.exists()) {
                    isOpen = configDoc.data()?.isOpen ?? true;
                    waitTime = configDoc.data()?.waitTime ?? 15;
                }
            } catch {
                // 默認值
            }

            // 取得今日銷售統計
            let todayRevenue = 0;
            let todayOrderCount = 0;
            try {
                const salesDoc = await getDoc(doc(db, `kitchens/${classId}/dailySales`, today));
                if (salesDoc.exists()) {
                    todayRevenue = salesDoc.data()?.revenue || 0;
                    todayOrderCount = salesDoc.data()?.orderCount || 0;
                }
            } catch {
                // 默認值
            }

            // 取得訂單狀態統計
            let pendingOrderCount = 0;
            let preparingOrderCount = 0;
            let completedOrderCount = 0;
            try {
                const ordersQuery = query(
                    collection(db, `kitchens/${classId}/orders`),
                    where('status', 'in', ['Pending', 'Preparing', 'Completed'])
                );
                const ordersSnapshot = await getDocs(ordersQuery);
                ordersSnapshot.forEach(orderDoc => {
                    const status = orderDoc.data().status;
                    if (status === 'Pending') pendingOrderCount++;
                    else if (status === 'Preparing') preparingOrderCount++;
                    else if (status === 'Completed') completedOrderCount++;
                });
            } catch {
                // 默認值
            }

            const stats: KitchenStats = {
                classId,
                className: kitchenData.className || classId,
                ownerName: kitchenData.ownerName || '',
                isOpen,
                waitTime,
                todayRevenue,
                todayOrderCount,
                pendingOrderCount,
                preparingOrderCount,
                completedOrderCount,
            };

            kitchensStats.push(stats);
            totalRevenue += todayRevenue;
            totalOrderCount += todayOrderCount;
            if (isOpen) activeKitchens++;
        }

        // 按班級排序
        kitchensStats.sort((a, b) => a.classId.localeCompare(b.classId));

        return {
            status: 'success',
            data: {
                kitchens: kitchensStats,
                totalRevenue,
                totalOrderCount,
                activeKitchens,
            }
        };
    } catch (error) {
        console.error('getAllKitchensStats error:', error);
        return { status: 'error', message: 'Failed to get all kitchens stats' };
    }
}
