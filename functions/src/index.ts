import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as cors from 'cors';

// 初始化 Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// CORS 設定
const corsHandler = cors({ origin: true });

// ============ 型別定義 ============

interface MenuItem {
    id: string;
    name: string;
    price: number;
    stock: number;
    category: 'main' | 'drink' | 'dessert';
    imageUrl?: string;
    isActive: boolean;
    createdAt: admin.firestore.Timestamp;
    updatedAt: admin.firestore.Timestamp;
}

interface OrderItem {
    menuItemId: string;
    name: string;
    quantity: number;
    price: number;
}

interface Order {
    id: string;
    customerInfo: {
        class: string;
        name: string;
    };
    items: OrderItem[];
    totalPrice: number;
    note?: string;
    status: 'Pending' | 'Preparing' | 'Completed' | 'Paid' | 'Cancelled';
    createdAt: admin.firestore.Timestamp;
    updatedAt: admin.firestore.Timestamp;
    completedAt?: admin.firestore.Timestamp;
    paidAt?: admin.firestore.Timestamp;
}

interface SystemConfig {
    isOpen: boolean;
    waitTime: number;
    updatedAt: admin.firestore.Timestamp;
}

// ============ 工具函式 ============

/**
 * 生成訂單編號：ORD-HHMM-XXX
 */
async function generateOrderId(): Promise<string> {
    const now = new Date();
    const hhmm = now.toTimeString().slice(0, 5).replace(':', '');

    // 取得今日訂單數量
    const today = now.toISOString().slice(0, 10);
    const countDoc = await db.collection('orderCounts').doc(today).get();

    let count = 1;
    if (countDoc.exists) {
        count = (countDoc.data()?.count || 0) + 1;
    }

    // 更新計數
    await db.collection('orderCounts').doc(today).set({ count }, { merge: true });

    const orderNum = String(count).padStart(3, '0');
    return `ORD-${hhmm}-${orderNum}`;
}

// ============ API 端點 ============

/**
 * 取得菜單
 */
export const getMenu = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        try {
            // 取得菜單
            const menuSnapshot = await db.collection('menuItems')
                .where('isActive', '==', true)
                .orderBy('name')
                .get();

            const menuItems: MenuItem[] = [];
            menuSnapshot.forEach(doc => {
                menuItems.push({ id: doc.id, ...doc.data() } as MenuItem);
            });

            // 取得系統設定
            const configDoc = await db.collection('system').doc('config').get();
            const config = configDoc.exists ? configDoc.data() as SystemConfig : { isOpen: true, waitTime: 15 };

            res.json({
                status: 'success',
                data: menuItems,
                system: {
                    isOpen: config.isOpen,
                    waitTime: config.waitTime
                }
            });
        } catch (error) {
            console.error('getMenu error:', error);
            res.status(500).json({ status: 'error', message: 'Failed to get menu' });
        }
    });
});

/**
 * 取得熱銷品項
 */
export const getTrending = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        try {
            const today = new Date().toISOString().slice(0, 10);
            const salesDoc = await db.collection('dailySales').doc(today).get();

            if (!salesDoc.exists) {
                res.json({ status: 'success', data: [] });
                return;
            }

            const itemSales = salesDoc.data()?.itemSales || {};
            const sorted = Object.entries(itemSales)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .slice(0, 5)
                .map(([name]) => name);

            res.json({ status: 'success', data: sorted });
        } catch (error) {
            console.error('getTrending error:', error);
            res.status(500).json({ status: 'error', message: 'Failed to get trending' });
        }
    });
});

/**
 * 顧客下單
 */
export const placeOrder = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).json({ status: 'error', message: 'Method not allowed' });
            return;
        }

        try {
            const { customerClass, customerName, items, totalPrice, note } = req.body;

            if (!customerClass || !customerName || !items || items.length === 0) {
                res.status(400).json({ status: 'error', message: 'Missing required fields' });
                return;
            }

            // 檢查系統是否開放
            const configDoc = await db.collection('system').doc('config').get();
            if (configDoc.exists && configDoc.data()?.isOpen === false) {
                res.status(400).json({ status: 'error', message: 'Shop is closed' });
                return;
            }

            // 生成訂單編號
            const orderId = await generateOrderId();

            // 使用批次寫入
            const batch = db.batch();

            // 扣減庫存
            for (const item of items) {
                const menuRef = db.collection('menuItems').doc(item.menuItemId || item.name);
                batch.update(menuRef, {
                    stock: admin.firestore.FieldValue.increment(-item.quantity)
                });
            }

            // 建立訂單
            const orderRef = db.collection('orders').doc(orderId);
            const orderData: Partial<Order> = {
                id: orderId,
                customerInfo: {
                    class: customerClass,
                    name: customerName
                },
                items: items.map((item: any) => ({
                    menuItemId: item.menuItemId || item.name,
                    name: item.name,
                    quantity: item.quantity || item.qty,
                    price: item.price
                })),
                totalPrice,
                note: note || '',
                status: 'Pending',
                createdAt: admin.firestore.Timestamp.now(),
                updatedAt: admin.firestore.Timestamp.now()
            };
            batch.set(orderRef, orderData);

            await batch.commit();

            res.json({ status: 'success', orderId });
        } catch (error) {
            console.error('placeOrder error:', error);
            res.status(500).json({ status: 'error', message: 'Failed to place order' });
        }
    });
});

/**
 * 取得訂單列表 (廚房用)
 */
export const getOrders = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        try {
            const ordersSnapshot = await db.collection('orders')
                .where('status', 'in', ['Pending', 'Preparing', 'Completed'])
                .orderBy('createdAt', 'asc')
                .get();

            const orders: any[] = [];
            ordersSnapshot.forEach(doc => {
                const data = doc.data();
                orders.push({
                    orderId: doc.id,
                    info: `${data.customerInfo.class} ${data.customerInfo.name}`,
                    items: data.items,
                    total: data.totalPrice,
                    note: data.note,
                    status: data.status,
                    time: data.createdAt.toDate().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
                });
            });

            res.json({ status: 'success', data: orders });
        } catch (error) {
            console.error('getOrders error:', error);
            res.status(500).json({ status: 'error', message: 'Failed to get orders' });
        }
    });
});

/**
 * 更新訂單狀態
 */
export const updateOrderStatus = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).json({ status: 'error', message: 'Method not allowed' });
            return;
        }

        try {
            const { orderId, status } = req.body;

            if (!orderId || !status) {
                res.status(400).json({ status: 'error', message: 'Missing orderId or status' });
                return;
            }

            const updateData: any = {
                status,
                updatedAt: admin.firestore.Timestamp.now()
            };

            if (status === 'Completed') {
                updateData.completedAt = admin.firestore.Timestamp.now();
            } else if (status === 'Paid') {
                updateData.paidAt = admin.firestore.Timestamp.now();

                // 更新每日銷售統計
                const orderDoc = await db.collection('orders').doc(orderId).get();
                if (orderDoc.exists) {
                    const orderData = orderDoc.data()!;
                    const today = new Date().toISOString().slice(0, 10);
                    const salesRef = db.collection('dailySales').doc(today);

                    const itemSalesUpdate: any = {};
                    orderData.items.forEach((item: OrderItem) => {
                        itemSalesUpdate[`itemSales.${item.name}`] = admin.firestore.FieldValue.increment(item.quantity);
                    });

                    await salesRef.set({
                        date: today,
                        revenue: admin.firestore.FieldValue.increment(orderData.totalPrice),
                        orderCount: admin.firestore.FieldValue.increment(1),
                        ...itemSalesUpdate
                    }, { merge: true });
                }
            }

            await db.collection('orders').doc(orderId).update(updateData);

            res.json({ status: 'success' });
        } catch (error) {
            console.error('updateOrderStatus error:', error);
            res.status(500).json({ status: 'error', message: 'Failed to update status' });
        }
    });
});

/**
 * 取消訂單
 */
export const cancelOrder = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).json({ status: 'error', message: 'Method not allowed' });
            return;
        }

        try {
            const { orderId } = req.body;

            if (!orderId) {
                res.status(400).json({ status: 'error', message: 'Missing orderId' });
                return;
            }

            const orderDoc = await db.collection('orders').doc(orderId).get();
            if (!orderDoc.exists) {
                res.status(404).json({ status: 'error', message: 'Order not found' });
                return;
            }

            const orderData = orderDoc.data()!;
            const batch = db.batch();

            // 回補庫存
            for (const item of orderData.items) {
                const menuRef = db.collection('menuItems').doc(item.menuItemId || item.name);
                batch.update(menuRef, {
                    stock: admin.firestore.FieldValue.increment(item.quantity)
                });
            }

            // 更新訂單狀態
            batch.update(db.collection('orders').doc(orderId), {
                status: 'Cancelled',
                updatedAt: admin.firestore.Timestamp.now()
            });

            await batch.commit();

            res.json({ status: 'success' });
        } catch (error) {
            console.error('cancelOrder error:', error);
            res.status(500).json({ status: 'error', message: 'Failed to cancel order' });
        }
    });
});

/**
 * 查詢訂單狀態 (顧客用)
 */
export const checkStatus = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        try {
            const orderIds = (req.query.orderIds as string || '').split(',').filter(Boolean);

            if (orderIds.length === 0) {
                res.json({ status: 'success', data: {} });
                return;
            }

            const result: Record<string, string> = {};

            for (const orderId of orderIds) {
                const orderDoc = await db.collection('orders').doc(orderId).get();
                if (orderDoc.exists) {
                    result[orderId] = orderDoc.data()?.status || 'Unknown';
                }
            }

            res.json({ status: 'success', data: result });
        } catch (error) {
            console.error('checkStatus error:', error);
            res.status(500).json({ status: 'error', message: 'Failed to check status' });
        }
    });
});

/**
 * 更新庫存
 */
export const updateStock = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).json({ status: 'error', message: 'Method not allowed' });
            return;
        }

        try {
            const { id, qty } = req.body;

            if (!id || qty === undefined) {
                res.status(400).json({ status: 'error', message: 'Missing id or qty' });
                return;
            }

            await db.collection('menuItems').doc(id).update({
                stock: parseInt(qty, 10),
                updatedAt: admin.firestore.Timestamp.now()
            });

            res.json({ status: 'success' });
        } catch (error) {
            console.error('updateStock error:', error);
            res.status(500).json({ status: 'error', message: 'Failed to update stock' });
        }
    });
});

/**
 * 取得統計資料
 */
export const getStats = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        try {
            const today = new Date().toISOString().slice(0, 10);
            const salesDoc = await db.collection('dailySales').doc(today).get();

            let revenue = 0;
            let orderCount = 0;
            let ranking: { name: string; qty: number }[] = [];

            if (salesDoc.exists) {
                const data = salesDoc.data()!;
                revenue = data.revenue || 0;
                orderCount = data.orderCount || 0;

                const itemSales = data.itemSales || {};
                ranking = Object.entries(itemSales)
                    .map(([name, qty]) => ({ name, qty: qty as number }))
                    .sort((a, b) => b.qty - a.qty);
            }

            res.json({
                status: 'success',
                data: { revenue, orderCount, ranking }
            });
        } catch (error) {
            console.error('getStats error:', error);
            res.status(500).json({ status: 'error', message: 'Failed to get stats' });
        }
    });
});

/**
 * 設定系統狀態
 */
export const setSystemConfig = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).json({ status: 'error', message: 'Method not allowed' });
            return;
        }

        try {
            const { isOpen, waitTime } = req.body;

            const updateData: any = {
                updatedAt: admin.firestore.Timestamp.now()
            };

            if (isOpen !== undefined) updateData.isOpen = isOpen;
            if (waitTime !== undefined) updateData.waitTime = parseInt(waitTime, 10);

            await db.collection('system').doc('config').set(updateData, { merge: true });

            res.json({ status: 'success' });
        } catch (error) {
            console.error('setSystemConfig error:', error);
            res.status(500).json({ status: 'error', message: 'Failed to update config' });
        }
    });
});

/**
 * 新增菜單品項
 */
export const addMenuItem = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).json({ status: 'error', message: 'Method not allowed' });
            return;
        }

        try {
            const { name, price, stock, category } = req.body;

            if (!name || !price) {
                res.status(400).json({ status: 'error', message: 'Missing name or price' });
                return;
            }

            const docRef = db.collection('menuItems').doc();
            await docRef.set({
                id: docRef.id,
                name,
                price: parseInt(price, 10),
                stock: parseInt(stock || '0', 10),
                category: category || 'main',
                isActive: true,
                createdAt: admin.firestore.Timestamp.now(),
                updatedAt: admin.firestore.Timestamp.now()
            });

            res.json({ status: 'success', id: docRef.id });
        } catch (error) {
            console.error('addMenuItem error:', error);
            res.status(500).json({ status: 'error', message: 'Failed to add item' });
        }
    });
});

/**
 * 更新菜單品項
 */
export const updateMenuItem = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).json({ status: 'error', message: 'Method not allowed' });
            return;
        }

        try {
            const { id, name, price, category } = req.body;

            if (!id) {
                res.status(400).json({ status: 'error', message: 'Missing id' });
                return;
            }

            const updateData: any = { updatedAt: admin.firestore.Timestamp.now() };
            if (name) updateData.name = name;
            if (price) updateData.price = parseInt(price, 10);
            if (category) updateData.category = category;

            await db.collection('menuItems').doc(id).update(updateData);

            res.json({ status: 'success' });
        } catch (error) {
            console.error('updateMenuItem error:', error);
            res.status(500).json({ status: 'error', message: 'Failed to update item' });
        }
    });
});

/**
 * 刪除菜單品項
 */
export const deleteMenuItem = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).json({ status: 'error', message: 'Method not allowed' });
            return;
        }

        try {
            const { id } = req.body;

            if (!id) {
                res.status(400).json({ status: 'error', message: 'Missing id' });
                return;
            }

            // 軟刪除
            await db.collection('menuItems').doc(id).update({
                isActive: false,
                updatedAt: admin.firestore.Timestamp.now()
            });

            res.json({ status: 'success' });
        } catch (error) {
            console.error('deleteMenuItem error:', error);
            res.status(500).json({ status: 'error', message: 'Failed to delete item' });
        }
    });
});

/**
 * 清除所有訂單
 */
export const clearAllOrders = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).json({ status: 'error', message: 'Method not allowed' });
            return;
        }

        try {
            const ordersSnapshot = await db.collection('orders').get();
            const batch = db.batch();

            ordersSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });

            // 清除今日統計
            const today = new Date().toISOString().slice(0, 10);
            batch.delete(db.collection('dailySales').doc(today));
            batch.delete(db.collection('orderCounts').doc(today));

            await batch.commit();

            res.json({ status: 'success' });
        } catch (error) {
            console.error('clearAllOrders error:', error);
            res.status(500).json({ status: 'error', message: 'Failed to clear orders' });
        }
    });
});
