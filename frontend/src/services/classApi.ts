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
    increment,
    runTransaction
} from 'firebase/firestore';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebase';
import type { MenuItem, Order, SystemConfig, ApiResponse, CategoryItem } from '../types';

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
        // 先檢查系統設定
        const configDoc = await getDoc(doc(db, getSystemConfigPath(classId)));
        if (configDoc.exists() && configDoc.data()?.isOpen === false) {
            return { status: 'error', message: '目前暫停接單' };
        }

        // 生成訂單編號（在 Transaction 外執行以避免衝突）
        const orderId = await generateClassOrderId(classId);
        const today = new Date().toISOString().slice(0, 10);

        // 使用 Transaction 確保庫存原子性操作
        await runTransaction(db, async (transaction) => {
            // ====== 階段 1: 所有讀取操作必須先完成 ======

            // 1a. 讀取所有相關菜單項目的當前庫存
            const menuRefs = items.map(item =>
                doc(db, getMenuItemsPath(classId), item.menuItemId || item.name)
            );
            const menuSnaps = await Promise.all(
                menuRefs.map(ref => transaction.get(ref))
            );

            // 1b. 讀取每日銷售統計（必須在任何寫入之前完成）
            const dailySalesRef = doc(db, getDailySalesPath(classId), today);
            const dailySalesSnap = await transaction.get(dailySalesRef);

            // ====== 階段 2: 驗證資料 ======

            // 2. 驗證庫存是否足夠
            for (let i = 0; i < menuSnaps.length; i++) {
                const menuSnap = menuSnaps[i];
                if (!menuSnap.exists()) {
                    throw new Error(`品項 ${items[i].name} 不存在`);
                }
                const currentStock = menuSnap.data()?.stock || 0;
                if (currentStock < items[i].quantity) {
                    throw new Error(`${items[i].name} 庫存不足（剩餘 ${currentStock}）`);
                }
            }

            // ====== 階段 3: 所有寫入操作 ======

            // 3. 扣除庫存
            for (let i = 0; i < menuRefs.length; i++) {
                transaction.update(menuRefs[i], {
                    stock: increment(-items[i].quantity),
                    updatedAt: Timestamp.now()
                });
            }

            // 4. 建立訂單
            const orderRef = doc(db, getOrdersPath(classId), orderId);
            transaction.set(orderRef, {
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

            // 5. 更新每日銷售統計
            if (!dailySalesSnap.exists()) {
                const initialItemSales: Record<string, number> = {};
                for (const item of items) {
                    initialItemSales[item.name] = item.quantity;
                }
                transaction.set(dailySalesRef, {
                    revenue: totalPrice,
                    orderCount: 1,
                    itemSales: initialItemSales,
                    date: today,
                    updatedAt: Timestamp.now()
                });
            } else {
                const itemUpdates: Record<string, unknown> = {};
                for (const item of items) {
                    itemUpdates[`itemSales.${item.name}`] = increment(item.quantity);
                }
                transaction.update(dailySalesRef, {
                    revenue: increment(totalPrice),
                    orderCount: increment(1),
                    ...itemUpdates,
                    updatedAt: Timestamp.now()
                });
            }
        });

        return { status: 'success', orderId };
    } catch (error) {
        console.error('placeClassOrder error:', error);
        const message = error instanceof Error ? error.message : 'Failed to place order';
        return { status: 'error', message };
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
            // 銷售統計已在下單時更新，這裡不需要再更新
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

/**
 * 檢查班級訂單狀態（用於顧客端訂單追蹤）
 */
export async function checkClassOrderStatus(classId: string, orderIds: string[]): Promise<ApiResponse<Record<string, string>>> {
    try {
        const result: Record<string, string> = {};
        for (const orderId of orderIds) {
            const orderDocSnap = await getDoc(doc(db, getOrdersPath(classId), orderId));
            if (orderDocSnap.exists()) {
                result[orderId] = orderDocSnap.data()?.status || 'Unknown';
            }
        }
        return { status: 'success', data: result };
    } catch (error) {
        console.error('checkClassOrderStatus error:', error);
        return { status: 'error', message: 'Failed to check status' };
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

// ============ 班級管理 API ============

export interface Kitchen {
    id: string;
    classId: string;
    className: string;
    ownerUid?: string;
    ownerName?: string;
    isOpen?: boolean;
    createdAt?: Date;
}

/**
 * 獲取所有班級廚房列表
 */
export async function getAllKitchens(): Promise<ApiResponse<Kitchen[]>> {
    try {
        const kitchensSnapshot = await getDocs(collection(db, 'kitchens'));
        const kitchens: Kitchen[] = [];

        for (const docSnap of kitchensSnapshot.docs) {
            const data = docSnap.data();

            // 跳過已刪除的班級
            if (data.isDeleted) {
                continue;
            }

            // 檢查該班級是否有菜單（至少有一個菜品）
            const menuSnapshot = await getDocs(
                query(collection(db, `kitchens/${docSnap.id}/menuItems`), where('isActive', '==', true))
            );
            // 檢查系統設定
            const configDoc = await getDoc(doc(db, `kitchens/${docSnap.id}/system/config`));
            const isOpen = configDoc.exists() ? configDoc.data()?.isOpen !== false : true;

            if (menuSnapshot.size > 0) {
                kitchens.push({
                    id: docSnap.id,
                    classId: docSnap.id,
                    className: data.className || docSnap.id,
                    ownerUid: data.ownerUid,
                    ownerName: data.ownerName,
                    isOpen,
                    createdAt: data.createdAt?.toDate()
                });
            }
        }

        return { status: 'success', data: kitchens };
    } catch (error) {
        console.error('getAllKitchens error:', error);
        return { status: 'error', message: 'Failed to get kitchens' };
    }
}

/**
 * 建立新班級廚房
 */
export async function createKitchen(
    classId: string,
    className: string,
    ownerUid?: string,
    ownerName?: string
): Promise<ApiResponse> {
    try {
        await setDoc(doc(db, 'kitchens', classId), {
            classId,
            className,
            ownerUid,
            ownerName,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });

        // 建立預設系統設定
        await setDoc(doc(db, `kitchens/${classId}/system/config`), {
            isOpen: true,
            waitTime: 15,
            createdAt: Timestamp.now()
        });

        return { status: 'success' };
    } catch (error) {
        console.error('createKitchen error:', error);
        return { status: 'error', message: 'Failed to create kitchen' };
    }
}

/**
 * 更新班級廚房資訊
 */
export async function updateKitchen(
    classId: string,
    updates: {
        className?: string;
        ownerUid?: string;
        ownerName?: string;
        isOpen?: boolean;
    }
): Promise<ApiResponse> {
    try {
        // 更新廚房基本資訊
        const kitchenUpdates: Record<string, unknown> = {
            updatedAt: Timestamp.now()
        };

        if (updates.className !== undefined) {
            kitchenUpdates.className = updates.className;
        }
        if (updates.ownerUid !== undefined) {
            kitchenUpdates.ownerUid = updates.ownerUid;
        }
        if (updates.ownerName !== undefined) {
            kitchenUpdates.ownerName = updates.ownerName;
        }

        await updateDoc(doc(db, 'kitchens', classId), kitchenUpdates);

        // 如果有更新營業狀態，同步到系統設定
        if (updates.isOpen !== undefined) {
            await setClassSystemConfig(classId, { isOpen: updates.isOpen });
        }

        return { status: 'success' };
    } catch (error) {
        console.error('updateKitchen error:', error);
        return { status: 'error', message: 'Failed to update kitchen' };
    }
}

/**
 * 刪除班級廚房（軟刪除）
 */
export async function deleteKitchen(classId: string): Promise<ApiResponse> {
    try {
        await updateDoc(doc(db, 'kitchens', classId), {
            isDeleted: true,
            deletedAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });

        return { status: 'success' };
    } catch (error) {
        console.error('deleteKitchen error:', error);
        return { status: 'error', message: 'Failed to delete kitchen' };
    }
}


// ============ 圖片 API ============

/**
 * 上傳菜單品項圖片
 */
export async function uploadMenuItemImage(
    classId: string,
    itemId: string,
    file: File
): Promise<ApiResponse<{ imageUrl: string }>> {
    try {
        // 產生唯一檔名
        const ext = file.name.split('.').pop() || 'jpg';
        const filename = `${itemId}_${Date.now()}.${ext}`;
        const storagePath = `kitchens/${classId}/menuItems/${filename}`;

        // 上傳到 Firebase Storage
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, file);

        // 取得下載 URL
        const imageUrl = await getDownloadURL(storageRef);

        // 更新 Firestore
        await updateDoc(doc(db, getMenuItemsPath(classId), itemId), {
            imageUrl,
            updatedAt: Timestamp.now()
        });

        return { status: 'success', data: { imageUrl } };
    } catch (error) {
        console.error('uploadMenuItemImage error:', error);
        return { status: 'error', message: 'Failed to upload image' };
    }
}

/**
 * 刪除菜單品項圖片
 */
export async function deleteMenuItemImage(
    classId: string,
    itemId: string,
    imageUrl?: string
): Promise<ApiResponse> {
    try {
        // 如果有提供 imageUrl，嘗試從 Storage 刪除
        if (imageUrl && imageUrl.includes('firebasestorage')) {
            try {
                const storageRef = ref(storage, imageUrl);
                await deleteObject(storageRef);
            } catch (e) {
                // 忽略刪除錯誤（檔案可能不存在）
                console.warn('Could not delete storage object:', e);
            }
        }

        // 清除 Firestore 中的 imageUrl
        await updateDoc(doc(db, getMenuItemsPath(classId), itemId), {
            imageUrl: '',
            updatedAt: Timestamp.now()
        });

        return { status: 'success' };
    } catch (error) {
        console.error('deleteMenuItemImage error:', error);
        return { status: 'error', message: 'Failed to delete image' };
    }
}

// ============ 分類 API ============

// 預設分類
const DEFAULT_CATEGORIES: CategoryItem[] = [
    { id: 'main', name: '主食/便當', icon: '🍱', order: 1 },
    { id: 'noodles', name: '麵食', icon: '🍜', order: 2 },
    { id: 'burger', name: '漢堡/輕食', icon: '🍔', order: 3 },
    { id: 'snack', name: '炸物/小吃', icon: '🍟', order: 4 },
    { id: 'soup', name: '湯品', icon: '🥣', order: 5 },
    { id: 'drink', name: '飲料', icon: '🥤', order: 6 },
    { id: 'dessert', name: '甜點/冰品', icon: '🍦', order: 7 },
    { id: 'other', name: '其他', icon: '📦', order: 8 }
];

/**
 * 取得班級分類列表
 */
export async function getClassCategories(classId: string): Promise<ApiResponse<CategoryItem[]>> {
    try {
        const configDoc = await getDoc(doc(db, getSystemConfigPath(classId)));
        if (configDoc.exists() && configDoc.data()?.categories) {
            const categories = configDoc.data().categories as CategoryItem[];
            return { status: 'success', data: categories.sort((a, b) => a.order - b.order) };
        }
        // 回傳預設分類
        return { status: 'success', data: DEFAULT_CATEGORIES };
    } catch (error) {
        console.error('getClassCategories error:', error);
        return { status: 'error', message: 'Failed to get categories' };
    }
}

/**
 * 更新班級分類列表
 */
export async function updateClassCategories(
    classId: string,
    categories: CategoryItem[]
): Promise<ApiResponse> {
    try {
        await setDoc(doc(db, getSystemConfigPath(classId)), {
            categories,
            updatedAt: Timestamp.now()
        }, { merge: true });
        return { status: 'success' };
    } catch (error) {
        console.error('updateClassCategories error:', error);
        return { status: 'error', message: 'Failed to update categories' };
    }
}
