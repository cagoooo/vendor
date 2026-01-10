/**
 * 進階報表 API
 * 提供銷售趨勢、高峰時段分析等數據
 */

import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from './firebase';

export interface DailySalesData {
    date: string;
    revenue: number;
    orderCount: number;
    itemSales: Record<string, number>;
}

export interface HourlyData {
    hour: number;
    count: number;
    revenue: number;
}

export interface ReportData {
    dailySales: DailySalesData[];
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    topItems: { name: string; qty: number; revenue?: number }[];
    hourlyDistribution?: HourlyData[];
}

/**
 * 取得指定日期範圍的銷售數據
 */
export async function getSalesReport(
    classId: string,
    startDate: string,
    endDate: string
): Promise<ReportData> {
    const dailySalesPath = `kitchens/${classId}/dailySales`;
    const salesRef = collection(db, dailySalesPath);

    // Query sales within date range
    const q = query(
        salesRef,
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'asc')
    );

    const snapshot = await getDocs(q);
    const dailySales: DailySalesData[] = [];
    let totalRevenue = 0;
    let totalOrders = 0;
    const itemTotals: Record<string, number> = {};

    snapshot.forEach(doc => {
        const data = doc.data();
        dailySales.push({
            date: data.date || doc.id,
            revenue: data.revenue || 0,
            orderCount: data.orderCount || 0,
            itemSales: data.itemSales || {},
        });

        totalRevenue += data.revenue || 0;
        totalOrders += data.orderCount || 0;

        // Aggregate item sales
        if (data.itemSales) {
            Object.entries(data.itemSales).forEach(([name, qty]) => {
                itemTotals[name] = (itemTotals[name] || 0) + (qty as number);
            });
        }
    });

    // Sort items by quantity
    const topItems = Object.entries(itemTotals)
        .map(([name, qty]) => ({ name, qty }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 10);

    const averageOrderValue = totalOrders > 0
        ? Math.round(totalRevenue / totalOrders)
        : 0;

    return {
        dailySales,
        totalRevenue,
        totalOrders,
        averageOrderValue,
        topItems,
    };
}

/**
 * 取得訂單時段分布（需從訂單記錄分析）
 */
export async function getHourlyDistribution(
    classId: string,
    date: string
): Promise<HourlyData[]> {
    const ordersPath = `kitchens/${classId}/orders`;
    const ordersRef = collection(db, ordersPath);

    // Get orders for the specified date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const snapshot = await getDocs(ordersRef);
    const hourlyData: Record<number, { count: number; revenue: number }> = {};

    // Initialize all hours
    for (let h = 0; h < 24; h++) {
        hourlyData[h] = { count: 0, revenue: 0 };
    }

    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.createdAt) {
            const orderDate = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
            const orderDateStr = orderDate.toISOString().slice(0, 10);

            if (orderDateStr === date) {
                const hour = orderDate.getHours();
                hourlyData[hour].count++;
                hourlyData[hour].revenue += data.totalPrice || 0;
            }
        }
    });

    return Object.entries(hourlyData)
        .map(([hour, data]) => ({
            hour: parseInt(hour),
            count: data.count,
            revenue: data.revenue,
        }))
        .filter(d => d.count > 0 || (parseInt(d.hour.toString()) >= 10 && parseInt(d.hour.toString()) <= 20));
}

/**
 * 匯出數據為 CSV
 */
export function exportToCSV(data: ReportData, filename: string): void {
    // Header
    let csv = '日期,營收,訂單數\n';

    // Data rows
    data.dailySales.forEach(day => {
        csv += `${day.date},${day.revenue},${day.orderCount}\n`;
    });

    // Summary
    csv += `\n總計,${data.totalRevenue},${data.totalOrders}\n`;
    csv += `平均客單價,${data.averageOrderValue},\n`;

    // Top items
    csv += '\n品項,銷售數量\n';
    data.topItems.forEach(item => {
        csv += `${item.name},${item.qty}\n`;
    });

    // Download
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

/**
 * 計算日期範圍
 */
export function getDateRange(period: 'day' | 'week' | 'month'): { start: string; end: string } {
    const end = new Date();
    const start = new Date();

    switch (period) {
        case 'day':
            // Today only
            break;
        case 'week':
            start.setDate(start.getDate() - 6);
            break;
        case 'month':
            start.setDate(start.getDate() - 29);
            break;
    }

    return {
        start: start.toISOString().slice(0, 10),
        end: end.toISOString().slice(0, 10),
    };
}
