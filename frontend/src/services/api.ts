/**
 * @deprecated 此檔案已棄用
 * 
 * 請使用以下替代方案：
 * - 多班級 API: import { ... } from './classApi'
 * - 統一入口: import { api } from './api/index'
 * 
 * 此檔案使用全局 collection，不支援多班級系統。
 * 將在 v4.0.0 移除。
 * 
 * @see classApi.ts - 支援多班級的完整 API
 */
import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
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


// ============ 菜單 API ============

export async function getMenu(): Promise<ApiResponse<MenuItem[]>> {
    try {
        const menuQuery = query(
            collection(db, 'menuItems'),
            where('isActive', '==', true),
            orderBy('name')
        );
        const snapshot = await getDocs(menuQuery);
        const items: MenuItem[] = snapshot.docs.map((docSnap: QueryDocumentSnapshot<DocumentData>) => ({
            id: docSnap.id,
            ...docSnap.data()
        } as MenuItem));

        const configDoc = await getDoc(doc(db, 'system', 'config'));
        const config = configDoc.exists()
            ? configDoc.data() as SystemConfig
            : { isOpen: true, waitTime: 15 };

        return {
            status: 'success',
            data: items,
            system: config
        };
    } catch (error) {
        console.error('getMenu error:', error);
        return { status: 'error', message: 'Failed to get menu' };
    }
}

export async function getTrending(): Promise<ApiResponse<string[]>> {
    try {
        const today = new Date().toISOString().slice(0, 10);
        const salesDoc = await getDoc(doc(db, 'dailySales', today));

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
        console.error('getTrending error:', error);
        return { status: 'error', message: 'Failed to get trending' };
    }
}

// ============ 訂單 API ============

async function generateOrderId(): Promise<string> {
    const now = new Date();
    const hhmm = now.toTimeString().slice(0, 5).replace(':', '');
    const today = now.toISOString().slice(0, 10);

    const countDocRef = doc(db, 'orderCounts', today);
    const countDocSnap = await getDoc(countDocRef);

    let count = 1;
    if (countDocSnap.exists()) {
        count = (countDocSnap.data()?.count || 0) + 1;
    }

    await updateDoc(countDocRef, { count }).catch(() => {
        return addDoc(collection(db, 'orderCounts'), { count }).catch(() => { });
    });

    const orderNum = String(count).padStart(3, '0');
    return `ORD-${hhmm}-${orderNum}`;
}

export async function placeOrder(
    customerClass: string,
    customerName: string,
    items: { name: string; quantity: number; price: number; menuItemId?: string }[],
    totalPrice: number,
    note?: string
): Promise<ApiResponse> {
    try {
        const configDoc = await getDoc(doc(db, 'system', 'config'));
        if (configDoc.exists() && configDoc.data()?.isOpen === false) {
            return { status: 'error', message: '目前暫停接單' };
        }

        const orderId = await generateOrderId();
        const batch = writeBatch(db);
        const today = new Date().toISOString().slice(0, 10);

        // 更新庫存
        for (const item of items) {
            const menuRef = doc(db, 'menuItems', item.menuItemId || item.name);
            batch.update(menuRef, {
                stock: increment(-item.quantity)
            });
        }

        // 建立訂單
        const orderRef = doc(db, 'orders', orderId);
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

        // 更新每日銷售統計 - 需用 update 來支援 dot notation 路徑
        const dailySalesRef = doc(db, 'dailySales', today);

        // 先確保文件存在
        const dailySalesSnap = await getDoc(dailySalesRef);
        if (!dailySalesSnap.exists()) {
            // 初次建立
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
            // 更新現有文件 - 使用 update 以支援 field path
            batch.update(dailySalesRef, {
                revenue: increment(totalPrice),
                orderCount: increment(1),
                updatedAt: Timestamp.now()
            });
            // 分別更新每個商品銷量
            for (const item of items) {
                batch.update(dailySalesRef, {
                    [`itemSales.${item.name}`]: increment(item.quantity)
                });
            }
        }

        await batch.commit();
        return { status: 'success', orderId };
    } catch (error) {
        console.error('placeOrder error:', error);
        return { status: 'error', message: 'Failed to place order' };
    }
}

export async function getOrders(): Promise<ApiResponse<Order[]>> {
    try {
        const ordersQuery = query(
            collection(db, 'orders'),
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
        console.error('getOrders error:', error);
        return { status: 'error', message: 'Failed to get orders' };
    }
}

export function subscribeToOrders(callback: (orders: Order[]) => void): () => void {
    const ordersQuery = query(
        collection(db, 'orders'),
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

export async function updateOrderStatus(orderId: string, status: string): Promise<ApiResponse> {
    try {
        const updateData: Record<string, unknown> = {
            status,
            updatedAt: Timestamp.now()
        };

        if (status === 'Completed') {
            updateData.completedAt = Timestamp.now();
        } else if (status === 'Paid') {
            updateData.paidAt = Timestamp.now();

            const orderDocSnap = await getDoc(doc(db, 'orders', orderId));
            if (orderDocSnap.exists()) {
                const orderData = orderDocSnap.data();
                const today = new Date().toISOString().slice(0, 10);
                const salesRef = doc(db, 'dailySales', today);

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

        await updateDoc(doc(db, 'orders', orderId), updateData);
        return { status: 'success' };
    } catch (error) {
        console.error('updateOrderStatus error:', error);
        return { status: 'error', message: 'Failed to update status' };
    }
}

export async function cancelOrder(orderId: string): Promise<ApiResponse> {
    try {
        const orderDocSnap = await getDoc(doc(db, 'orders', orderId));
        if (!orderDocSnap.exists()) {
            return { status: 'error', message: 'Order not found' };
        }

        const orderData = orderDocSnap.data();
        const batch = writeBatch(db);

        for (const item of orderData.items) {
            const menuRef = doc(db, 'menuItems', item.menuItemId || item.name);
            batch.update(menuRef, { stock: increment(item.quantity) });
        }

        batch.update(doc(db, 'orders', orderId), {
            status: 'Cancelled',
            updatedAt: Timestamp.now()
        });

        await batch.commit();
        return { status: 'success' };
    } catch (error) {
        console.error('cancelOrder error:', error);
        return { status: 'error', message: 'Failed to cancel order' };
    }
}

export async function checkOrderStatus(orderIds: string[]): Promise<ApiResponse<Record<string, string>>> {
    try {
        const result: Record<string, string> = {};
        for (const orderId of orderIds) {
            const orderDocSnap = await getDoc(doc(db, 'orders', orderId));
            if (orderDocSnap.exists()) {
                result[orderId] = orderDocSnap.data()?.status || 'Unknown';
            }
        }
        return { status: 'success', data: result };
    } catch (error) {
        console.error('checkOrderStatus error:', error);
        return { status: 'error', message: 'Failed to check status' };
    }
}

// ============ 庫存 API ============

export async function updateStock(itemId: string, quantity: number): Promise<ApiResponse> {
    try {
        await updateDoc(doc(db, 'menuItems', itemId), {
            stock: quantity,
            updatedAt: Timestamp.now()
        });
        return { status: 'success' };
    } catch (error) {
        console.error('updateStock error:', error);
        return { status: 'error', message: 'Failed to update stock' };
    }
}

export async function addMenuItem(
    name: string,
    price: number,
    stock: number,
    category: string = 'main',
    imageUrl?: string
): Promise<ApiResponse> {
    try {
        const docRef = await addDoc(collection(db, 'menuItems'), {
            name, price, stock, category,
            imageUrl: imageUrl || '',
            isActive: true,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });
        return { status: 'success', data: { id: docRef.id } };
    } catch (error) {
        console.error('addMenuItem error:', error);
        return { status: 'error', message: 'Failed to add item' };
    }
}

export async function updateMenuItem(
    itemId: string,
    updates: { name?: string; price?: number; stock?: number; category?: string; imageUrl?: string; isActive?: boolean }
): Promise<ApiResponse> {
    try {
        await updateDoc(doc(db, 'menuItems', itemId), {
            ...updates,
            updatedAt: Timestamp.now()
        });
        return { status: 'success' };
    } catch (error) {
        console.error('updateMenuItem error:', error);
        return { status: 'error', message: 'Failed to update item' };
    }
}

// ============ 統計 API ============

export async function getStats(): Promise<ApiResponse> {
    try {
        const today = new Date().toISOString().slice(0, 10);
        const salesDocSnap = await getDoc(doc(db, 'dailySales', today));

        let revenue = 0;
        let orderCount = 0;
        let ranking: { name: string; qty: number }[] = [];

        if (salesDocSnap.exists()) {
            const data = salesDocSnap.data();
            console.log('dailySales raw data:', JSON.stringify(data, null, 2));

            revenue = data.revenue || 0;
            orderCount = data.orderCount || 0;

            const itemSales = data.itemSales || {};
            console.log('itemSales:', itemSales);

            ranking = Object.entries(itemSales)
                .map(([name, qty]) => ({ name, qty: qty as number }))
                .sort((a, b) => b.qty - a.qty);

            console.log('ranking:', ranking);
        } else {
            console.log('No dailySales document found for:', today);
        }

        return { status: 'success', data: { revenue, orderCount, ranking } };
    } catch (error) {
        console.error('getStats error:', error);
        return { status: 'error', message: 'Failed to get stats' };
    }
}

// ============ 系統設定 API ============

export async function setSystemConfig(config: Partial<SystemConfig>): Promise<ApiResponse> {
    try {
        await updateDoc(doc(db, 'system', 'config'), {
            ...config,
            updatedAt: Timestamp.now()
        }).catch(async () => {
            const { setDoc } = await import('firebase/firestore');
            await setDoc(doc(db, 'system', 'config'), {
                isOpen: config.isOpen ?? true,
                waitTime: config.waitTime ?? 15,
                updatedAt: Timestamp.now()
            });
        });
        return { status: 'success' };
    } catch (error) {
        console.error('setSystemConfig error:', error);
        return { status: 'error', message: 'Failed to update config' };
    }
}

export async function clearAllOrders(): Promise<ApiResponse> {
    try {
        const ordersSnapshot = await getDocs(collection(db, 'orders'));
        const batch = writeBatch(db);

        ordersSnapshot.forEach(docSnap => {
            batch.delete(docSnap.ref);
        });

        const today = new Date().toISOString().slice(0, 10);
        batch.delete(doc(db, 'dailySales', today));
        batch.delete(doc(db, 'orderCounts', today));

        await batch.commit();
        return { status: 'success' };
    } catch (error) {
        console.error('clearAllOrders error:', error);
        return { status: 'error', message: 'Failed to clear orders' };
    }
}
