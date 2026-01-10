import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useClassOrders } from '../../hooks/useClassOrders';
import { useAuth } from '../../contexts/AuthContext';
import {
    updateClassOrderStatus,
    cancelClassOrder,
    getClassMenu,
    getClassStats,
    setClassSystemConfig,
    clearClassOrders,
    getAllKitchens,
    getClassCategories,
    type Kitchen
} from '../../services/classApi';
import type { CategoryItem } from '../../types';
import type { Tab } from './types';
import { OrderList, KitchenHeader, InventoryPanel, StatsPanel } from './components';
import { OwnerDashboard } from '../../components/OwnerDashboard';
import { notificationSound } from '../../services/notificationSound';
import Swal from 'sweetalert2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

export function KitchenApp() {
    const { profile, logout, isOwner, currentClassId: authClassId } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('orders');
    const [isShopOpen, setIsShopOpen] = useState(true);
    const [waitTime, setWaitTime] = useState(15);
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [localCompletedSet, setLocalCompletedSet] = useState<Set<string>>(new Set());
    const lastPendingCount = useRef(0);

    // 班級切換功能（只有 owner 可用）
    const [kitchens, setKitchens] = useState<Kitchen[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
    const [searchParams] = useSearchParams();

    // 實際使用的 classId：owner 可以切換，其他人使用自己的班級
    const currentClassId = isOwner ? (selectedClassId || authClassId) : authClassId;

    // 載入所有班級（owner 專用）
    useEffect(() => {
        if (isOwner) {
            loadKitchens();
        }
    }, [isOwner]);

    // 從 URL 參數設定初始班級
    useEffect(() => {
        const classFromUrl = searchParams.get('class');
        if (isOwner && classFromUrl) {
            setSelectedClassId(classFromUrl);
        }
    }, [isOwner, searchParams]);

    const loadKitchens = async () => {
        const result = await getAllKitchens();
        if (result.status === 'success' && result.data) {
            setKitchens(result.data);
            // 如果還沒選擇班級且 URL 沒有指定，預設選第一個
            const classFromUrl = searchParams.get('class');
            if (!selectedClassId && !classFromUrl && result.data.length > 0) {
                setSelectedClassId(result.data[0].classId);
            }
        }
    };

    // 使用班級訂單 Hook
    const { orders, pendingCount, refetch } = useClassOrders(currentClassId, true);

    // 過濾掉本地已完成的訂單
    const filteredOrders = orders.filter(o => !localCompletedSet.has(o.id));

    // 新訂單音效
    useEffect(() => {
        if (pendingCount > lastPendingCount.current && lastPendingCount.current !== 0) {
            // 使用 notificationSound 服務
            notificationSound.play();
            Swal.fire({
                toast: true,
                position: 'bottom-end',
                icon: 'info',
                title: '新訂單進來囉！',
                showConfirmButton: false,
                timer: 3000,
                background: '#2d3748',
                color: '#fff',
            });
        }
        lastPendingCount.current = pendingCount;
    }, [pendingCount]);

    // 載入系統設定
    useEffect(() => {
        if (!currentClassId) return;
        loadSystemConfig();
        if (activeTab === 'inventory') loadInventory();
        if (activeTab === 'stats') loadStats();
    }, [activeTab, currentClassId]);

    const loadSystemConfig = async () => {
        if (!currentClassId) return;
        const result = await getClassMenu(currentClassId);
        if (result.status === 'success' && result.system) {
            setIsShopOpen(result.system.isOpen);
            setWaitTime(result.system.waitTime);
        }
    };

    const loadInventory = async () => {
        if (!currentClassId) return;
        const result = await getClassMenu(currentClassId);
        if (result.status === 'success') {
            setMenuItems(result.data || []);
        }
        // 同時載入分類
        await loadCategories();
    };

    const loadCategories = async () => {
        if (!currentClassId) return;
        const result = await getClassCategories(currentClassId);
        if (result.status === 'success' && result.data) {
            setCategories(result.data);
        }
    };

    const loadStats = async () => {
        if (!currentClassId) return;
        const result = await getClassStats(currentClassId);
        if (result.status === 'success') {
            setStats(result.data);
        }
    };



    const handleStatusUpdate = async (orderId: string, newStatus: string, total?: number) => {
        if (newStatus === 'Paid') {
            const result = await Swal.fire({
                title: '確認收款？',
                html: `<div class="text-3xl font-black text-green-400 my-2">$${total}</div>`,
                text: '確認已收到款項並完成交易',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#10b981',
                cancelButtonColor: '#d33',
                confirmButtonText: '是的，已收款',
                cancelButtonText: '尚未',
                background: '#1f2937',
                color: '#fff',
            });
            if (!result.isConfirmed) return;
            setLocalCompletedSet(prev => new Set(prev).add(orderId));
        }

        await updateClassOrderStatus(currentClassId!, orderId, newStatus);
        if (newStatus !== 'Paid') refetch();
    };

    const handleCancelOrder = async (orderId: string) => {
        const result = await Swal.fire({
            title: '確定廢棄？',
            text: '庫存將回補',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            background: '#1f2937',
            color: '#fff',
        });
        if (result.isConfirmed) {
            setLocalCompletedSet(prev => new Set(prev).add(orderId));
            await cancelClassOrder(currentClassId!, orderId);
        }
    };

    const handleToggleShop = async () => {
        if (!currentClassId) return;
        const newStatus = !isShopOpen;
        setIsShopOpen(newStatus);
        await setClassSystemConfig(currentClassId, { isOpen: newStatus });
    };

    const handleWaitTimeChange = async (value: number) => {
        if (!currentClassId) return;
        setWaitTime(value);
        await setClassSystemConfig(currentClassId, { waitTime: value });
    };

    const handleClearAll = async () => {
        if (!currentClassId) return;
        const result = await Swal.fire({
            title: '確定清除？',
            text: '將清除所有訂單和銷售統計',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            background: '#1f2937',
            color: '#fff',
        });
        if (result.isConfirmed) {
            await clearClassOrders(currentClassId);
            setLocalCompletedSet(new Set());

            // 顯示成功提示並刷新頁面
            await Swal.fire({
                title: '已清除！',
                text: '所有資料已清除，頁面將自動刷新',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
                background: '#1f2937',
                color: '#fff',
            });

            // 刷新頁面以同步所有視圖的數據
            window.location.reload();
        }
    };



    // 班級切換處理函數
    const handleClassSelect = (classId: string) => {
        setSelectedClassId(classId);
        setLocalCompletedSet(new Set());
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100">
            {/* 使用 KitchenHeader 組件 */}
            <KitchenHeader
                isOwner={isOwner}
                kitchens={kitchens}
                currentClassId={currentClassId}
                onClassSelect={handleClassSelect}
                isShopOpen={isShopOpen}
                waitTime={waitTime}
                onToggleShop={handleToggleShop}
                onWaitTimeChange={handleWaitTimeChange}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                profile={profile}
                onLogout={logout}
                onClearAll={handleClearAll}
            />

            {/* Main Content */}
            <main className="p-4 md:p-6 max-w-7xl mx-auto pb-24">
                {/* Orders Tab */}
                {activeTab === 'orders' && (
                    <OrderList
                        orders={filteredOrders}
                        onRefetch={refetch}
                        onStatusUpdate={handleStatusUpdate}
                        onCancel={handleCancelOrder}
                    />
                )}

                {/* Inventory Tab */}
                {activeTab === 'inventory' && (
                    <InventoryPanel
                        menuItems={menuItems}
                        categories={categories}
                        currentClassId={currentClassId}
                        onRefresh={loadInventory}
                        onCategoriesUpdate={setCategories}
                    />
                )}

                {/* Owner Dashboard Tab */}
                {
                    activeTab === 'dashboard' && isOwner && (
                        <div className="max-w-7xl mx-auto">
                            <OwnerDashboard />
                        </div>
                    )
                }

                {/* Stats Tab */}
                {activeTab === 'stats' && stats && (
                    <StatsPanel stats={stats} />
                )}
            </main >
        </div >
    );
}

export default KitchenApp;
