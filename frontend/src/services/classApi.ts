/**
 * 班級廚房專用 API
 * 所有的資料操作都會基於 classId 進行隔離
 */

import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    setDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    Timestamp,
    writeBatch,
    increment
} from 'firebase/firestore';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import type { MenuItem, Order, OrderItem, SystemConfig, ApiResponse } from '../types';

// ============ 取得 Collection 路徑 ============

function getMenuItemsPath(classId: string) {
    return `kitchens/${classId}/menuItems`;
}

function getOrdersPath(classId: string) {
    return `kitchens/${classId}/orders`;
}

function getDailySalesPath(classId: string) {
    return `kitchens/${classId}/dailySales`;
}

function getOrderCountsPath(classId: string) {
    return `kitchens/${classId}/orderCounts`;
}

function getSystemConfigPath(classId: string) {
    return `kitchens/${classId}/system/config`;
}

// ============ 菜單 API ============

export async function getClassMenu(classId: string): Promise<ApiResponse<MenuItem[]>> {
    try {
        const menuQuery = query(
            collection(db, getMenuItemsPath(classId)),
            where('isActive', '==', true),
            orderBy('name')
        );
        const snapshot = await getDocs(menuQuery);
        const items: MenuItem[] = snapshot.docs.map((docSnap: QueryDocumentSnapshot<DocumentData>) => ({
            id: docSnap.id,
            ...docSnap.data()
        } as MenuItem));

        const configDoc = await getDoc(doc(db, getSystemConfigPath(classId)));
        const config = configDoc.exists()
            ? configDoc.data() as SystemConfig
            : { isOpen: true, waitTime: 15 };

        return {
            status: 'success',
            data: items,
            system: config
        };
    } catch (error) {
        console.error('getClassMenu error:', error);
        return { status: 'error', message: 'Failed to get menu' };
    }
}

export async function getClassTrending(classId: string): Promise<ApiResponse<string[]>> {
    try {
        const today = new Date().toISOString().slice(0, 10);
        const salesDoc = await getDoc(doc(db, getDailySalesPath(classId), today));

        if (!salesDoc.exists()) {
            return { status: 'success', data: [] };
        }

        const itemSales = salesDoc.data()?.itemSales || {};
        const sorted = Object.entries(itemSales)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .slice(0, 5)
            .map(([name]) => name);

        return { status: 'success', data: sorted };
    } catch (error) {
        console.error('getClassTrending error:', error);
        return { status: 'error', message: 'Failed to get trending' };
    }
}

// ============ 訂單 API ============

async function generateClassOrderId(classId: string): Promise<string> {
    const now = new Date();
    const hhmm = now.toTimeString().slice(0, 5).replace(':', '');
    const today = now.toISOString().slice(0, 10);

    const countDocRef = doc(db, getOrderCountsPath(classId), today);
    const countDocSnap = await getDoc(countDocRef);

    let count = 1;
    if (countDocSnap.exists()) {
        count = (countDocSnap.data()?.count || 0) + 1;
    }

    // 使用 setDoc 以確保文件存在
    await setDoc(countDocRef, { count, date: today }, { merge: true });

    const orderNum = String(count).padStart(3, '0');
    return `ORD-${hhmm}-${orderNum}`;
}

export async function placeClassOrder(
    classId: string,
    customerClass: string,
    customerName: string,
    items: { name: string; quantity: number; price: number; menuItemId?: string }[],
    totalPrice: number,
    note?: string
): Promise<ApiResponse> {
    try {
        const configDoc = await getDoc(doc(db, getSystemConfigPath(classId)));
        if (configDoc.exists() && configDoc.data()?.isOpen === false) {
            return { status: 'error', message: '目前暫停接單' };
        }

        const orderId = await generateClassOrderId(classId);
        const batch = writeBatch(db);
        const today = new Date().toISOString().slice(0, 10);

        // 更新庫存
        for (const item of items) {
            const menuRef = doc(db, getMenuItemsPath(classId), item.menuItemId || item.name);
            batch.update(menuRef, {
                stock: increment(-item.quantity)
            });
        }

        // 建立訂單
        const orderRef = doc(db, getOrdersPath(classId), orderId);
        batch.set(orderRef, {
            id: orderId,
            customerInfo: { class: customerClass, name: customerName },
            items: items.map(item => ({
                menuItemId: item.menuItemId || item.name,
                name: item.name,
                quantity: item.quantity,
                price: item.price
            })),
            totalPrice,
            note: note || '',
            status: 'Pending',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });

        // 更新每日銷售統計
        const dailySalesRef = doc(db, getDailySalesPath(classId), today);
        const dailySalesSnap = await getDoc(dailySalesRef);

        if (!dailySalesSnap.exists()) {
            const initialItemSales: Record<string, number> = {};
            for (const item of items) {
                initialItemSales[item.name] = item.quantity;
            }
            batch.set(dailySalesRef, {
                revenue: totalPrice,
                orderCount: 1,
                itemSales: initialItemSales,
                date: today,
                updatedAt: Timestamp.now()
            });
        } else {
            batch.update(dailySalesRef, {
                revenue: increment(totalPrice),
                orderCount: increment(1),
                updatedAt: Timestamp.now()
            });
            for (const item of items) {
                batch.update(dailySalesRef, {
                    [`itemSales.${item.name}`]: increment(item.quantity)
                });
            }
        }

        await batch.commit();
        return { status: 'success', orderId };
    } catch (error) {
        console.error('placeClassOrder error:', error);
        return { status: 'error', message: 'Failed to place order' };
    }
}

export async function getClassOrders(classId: string): Promise<ApiResponse<Order[]>> {
    try {
        const ordersQuery = query(
            collection(db, getOrdersPath(classId)),
            where('status', 'in', ['Pending', 'Preparing', 'Completed']),
            orderBy('createdAt', 'asc')
        );
        const snapshot = await getDocs(ordersQuery);

        const orders: Order[] = snapshot.docs.map((docSnap: QueryDocumentSnapshot<DocumentData>) => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                orderId: docSnap.id,
                customerInfo: data.customerInfo,
                info: `${data.customerInfo.class} ${data.customerInfo.name}`,
                items: data.items,
                totalPrice: data.totalPrice,
                total: data.totalPrice,
                note: data.note,
                status: data.status,
                time: data.createdAt?.toDate()?.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
            };
        });

        return { status: 'success', data: orders };
    } catch (error) {
        console.error('getClassOrders error:', error);
        return { status: 'error', message: 'Failed to get orders' };
    }
}

export function subscribeToClassOrders(classId: string, callback: (orders: Order[]) => void): () => void {
    const ordersQuery = query(
        collection(db, getOrdersPath(classId)),
        where('status', 'in', ['Pending', 'Preparing', 'Completed']),
        orderBy('createdAt', 'asc')
    );

    return onSnapshot(ordersQuery, (snapshot) => {
        const orders: Order[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                orderId: docSnap.id,
                customerInfo: data.customerInfo,
                info: `${data.customerInfo.class} ${data.customerInfo.name}`,
                items: data.items,
                totalPrice: data.totalPrice,
                total: data.totalPrice,
                note: data.note,
                status: data.status,
                time: data.createdAt?.toDate()?.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
            };
        });
        callback(orders);
    });
}

export async function updateClassOrderStatus(classId: string, orderId: string, status: string): Promise<ApiResponse> {
    try {
        const updateData: Record<string, unknown> = {
            status,
            updatedAt: Timestamp.now()
        };

        if (status === 'Completed') {
            updateData.completedAt = Timestamp.now();
        } else if (status === 'Paid') {
            updateData.paidAt = Timestamp.now();

            const orderDocSnap = await getDoc(doc(db, getOrdersPath(classId), orderId));
            if (orderDocSnap.exists()) {
                const orderData = orderDocSnap.data();
                const today = new Date().toISOString().slice(0, 10);
                const salesRef = doc(db, getDailySalesPath(classId), today);

                const batch = writeBatch(db);
                const itemUpdates: Record<string, unknown> = {};
                orderData.items.forEach((item: OrderItem) => {
                    itemUpdates[`itemSales.${item.name}`] = increment(item.quantity);
                });

                batch.set(salesRef, {
                    date: today,
                    revenue: increment(orderData.totalPrice),
                    orderCount: increment(1),
                    ...itemUpdates
                }, { merge: true });

                await batch.commit();
            }
        }

        await updateDoc(doc(db, getOrdersPath(classId), orderId), updateData);
        return { status: 'success' };
    } catch (error) {
        console.error('updateClassOrderStatus error:', error);
        return { status: 'error', message: 'Failed to update status' };
    }
}

export async function cancelClassOrder(classId: string, orderId: string): Promise<ApiResponse> {
    try {
        const orderDocSnap = await getDoc(doc(db, getOrdersPath(classId), orderId));
        if (!orderDocSnap.exists()) {
            return { status: 'error', message: 'Order not found' };
        }

        const orderData = orderDocSnap.data();
        const batch = writeBatch(db);

        for (const item of orderData.items) {
            const menuRef = doc(db, getMenuItemsPath(classId), item.menuItemId || item.name);
            batch.update(menuRef, { stock: increment(item.quantity) });
        }

        batch.update(doc(db, getOrdersPath(classId), orderId), {
            status: 'Cancelled',
            updatedAt: Timestamp.now()
        });

        await batch.commit();
        return { status: 'success' };
    } catch (error) {
        console.error('cancelClassOrder error:', error);
        return { status: 'error', message: 'Failed to cancel order' };
    }
}

// ============ 庫存 API ============

export async function updateClassStock(classId: string, itemId: string, quantity: number): Promise<ApiResponse> {
    try {
        await updateDoc(doc(db, getMenuItemsPath(classId), itemId), {
            stock: quantity,
            updatedAt: Timestamp.now()
        });
        return { status: 'success' };
    } catch (error) {
        console.error('updateClassStock error:', error);
        return { status: 'error', message: 'Failed to update stock' };
    }
}

export async function addClassMenuItem(
    classId: string,
    name: string,
    price: number,
    stock: number,
    category: string = 'main',
    imageUrl?: string
): Promise<ApiResponse> {
    try {
        const docRef = await addDoc(collection(db, getMenuItemsPath(classId)), {
            name, price, stock, category,
            imageUrl: imageUrl || '',
            isActive: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });
        return { status: 'success', data: { id: docRef.id } };
    } catch (error) {
        console.error('addClassMenuItem error:', error);
        return { status: 'error', message: 'Failed to add item' };
    }
}

export async function updateClassMenuItem(
    classId: string,
    itemId: string,
    updates: { name?: string; price?: number; stock?: number; category?: string; imageUrl?: string; isActive?: boolean }
): Promise<ApiResponse> {
    try {
        await updateDoc(doc(db, getMenuItemsPath(classId), itemId), {
            ...updates,
            updatedAt: Timestamp.now()
        });
        return { status: 'success' };
    } catch (error) {
        console.error('updateClassMenuItem error:', error);
        return { status: 'error', message: 'Failed to update item' };
    }
}

// ============ 統計 API ============

export async function getClassStats(classId: string): Promise<ApiResponse> {
    try {
        const today = new Date().toISOString().slice(0, 10);
        const salesDocSnap = await getDoc(doc(db, getDailySalesPath(classId), today));

        let revenue = 0;
        let orderCount = 0;
        let ranking: { name: string; qty: number }[] = [];

        if (salesDocSnap.exists()) {
            const data = salesDocSnap.data();
            revenue = data.revenue || 0;
            orderCount = data.orderCount || 0;

            const itemSales = data.itemSales || {};
            ranking = Object.entries(itemSales)
                .map(([name, qty]) => ({ name, qty: qty as number }))
                .sort((a, b) => b.qty - a.qty);
        }

        return { status: 'success', data: { revenue, orderCount, ranking } };
    } catch (error) {
        console.error('getClassStats error:', error);
        return { status: 'error', message: 'Failed to get stats' };
    }
}

// ============ 系統設定 API ============

export async function setClassSystemConfig(classId: string, config: Partial<SystemConfig>): Promise<ApiResponse> {
    try {
        const configRef = doc(db, getSystemConfigPath(classId));
        await setDoc(configRef, {
            ...config,
            updatedAt: Timestamp.now()
        }, { merge: true });
        return { status: 'success' };
    } catch (error) {
        console.error('setClassSystemConfig error:', error);
        return { status: 'error', message: 'Failed to update config' };
    }
}

export async function clearClassOrders(classId: string): Promise<ApiResponse> {
    try {
        const ordersSnapshot = await getDocs(collection(db, getOrdersPath(classId)));
        const batch = writeBatch(db);

        ordersSnapshot.forEach(docSnap => {
            batch.delete(docSnap.ref);
        });

        const today = new Date().toISOString().slice(0, 10);
        batch.delete(doc(db, getDailySalesPath(classId), today));
        batch.delete(doc(db, getOrderCountsPath(classId), today));

        await batch.commit();
        return { status: 'success' };
    } catch (error) {
        console.error('clearClassOrders error:', error);
        return { status: 'error', message: 'Failed to clear orders' };
    }
}
