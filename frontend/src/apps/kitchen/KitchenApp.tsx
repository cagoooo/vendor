import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useClassOrders } from '../../hooks/useClassOrders';
import { useAuth } from '../../contexts/AuthContext';
import {
    updateClassOrderStatus,
    cancelClassOrder,
    getClassMenu,
    updateClassStock,
    addClassMenuItem,
    updateClassMenuItem,
    getClassStats,
    setClassSystemConfig,
    clearClassOrders,
    getAllKitchens,
    uploadMenuItemImage,
    deleteMenuItemImage,
    getClassCategories,
    updateClassCategories,
    type Kitchen
} from '../../services/classApi';
import type { CategoryItem } from '../../types';
import type { Tab } from './types';
import { OrderList, KitchenHeader } from './components';
import { OwnerDashboard } from '../../components/OwnerDashboard';
import { LowStockAlert } from '../../components/LowStockAlert';
import { notificationSound } from '../../services/notificationSound';
import {
    RefreshCw, Plus, Minus,
    DollarSign, ShoppingBag, TrendingUp,
    ImagePlus, X, Upload, Tag
} from 'lucide-react';
import Swal from 'sweetalert2';
import { Bar, Doughnut } from 'react-chartjs-2';
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
                {
                    activeTab === 'inventory' && (
                        <div className="max-w-4xl mx-auto">
                            {/* 庫存低量警示 */}
                            <LowStockAlert items={menuItems} threshold={5} />

                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold text-gray-300">庫存與菜單</h2>
                                <div className="flex gap-2">
                                    {/* 管理分類按鈕 */}
                                    <button
                                        onClick={async () => {
                                            // 常用 emoji 選項
                                            const emojiOptions = ['🍔', '🍛', '🍜', '🍝', '🍕', '🍟', '🌮', '🌯', '🥤', '☕', '🧋', '🍹', '🍰', '🍩', '🍪', '🧁', '🍦', '🍨', '🥗', '🥪', '🍱', '🍙', '🍘', '🍢', '🥟', '🍗', '🍖', '🥩', '🌭', '🥓'];

                                            // 分類管理介面
                                            const buildCategoryHtml = (cats: CategoryItem[], selectedEmoji = '🍔') => `
                                            <div class="text-left max-h-40 overflow-y-auto mb-4">
                                                ${cats.map((c) => `
                                                    <div class="flex items-center justify-between bg-gray-700 rounded-lg p-3 mb-2">
                                                        <span class="text-base">${c.icon} ${c.name}</span>
                                                        <button class="cat-del text-red-400 hover:text-red-300 text-sm px-3 py-1" data-id="${c.id}">刪除</button>
                                                    </div>
                                                `).join('')}
                                            </div>
                                            <div class="border-t border-gray-600 pt-4">
                                                <p class="text-sm text-gray-400 mb-2">新增分類</p>
                                                <input type="hidden" id="cat-icon" value="${selectedEmoji}">
                                                <div class="grid grid-cols-6 gap-1 mb-3 max-h-24 overflow-y-auto p-1 bg-gray-800 rounded-lg">
                                                    ${emojiOptions.map(e => `
                                                        <button type="button" class="emoji-btn text-xl p-2 rounded hover:bg-gray-600 transition ${e === selectedEmoji ? 'bg-orange-500' : 'bg-gray-700'}" data-emoji="${e}">${e}</button>
                                                    `).join('')}
                                                </div>
                                                <input id="cat-name" class="w-full h-10 px-3 rounded-lg border border-gray-600 bg-gray-700 text-white" placeholder="分類名稱">
                                            </div>
                                        `;

                                            let currentCats = [...categories];

                                            // 如果是預設分類且尚未儲存，先初始化到 Firestore
                                            if (currentClassId && currentCats.length > 0 && currentCats[0].id === 'main') {
                                                await updateClassCategories(currentClassId, currentCats);
                                            }

                                            const result = await Swal.fire({
                                                title: '管理分類',
                                                html: buildCategoryHtml(currentCats),
                                                showCancelButton: true,
                                                confirmButtonText: '新增分類',
                                                cancelButtonText: '關閉',
                                                confirmButtonColor: '#10b981',
                                                background: '#1f2937',
                                                color: '#fff',
                                                didOpen: () => {
                                                    // 綁定 emoji 選擇事件
                                                    document.querySelectorAll('.emoji-btn').forEach(btn => {
                                                        btn.addEventListener('click', (e) => {
                                                            const emoji = (e.target as HTMLElement).dataset.emoji;
                                                            if (emoji) {
                                                                (document.getElementById('cat-icon') as HTMLInputElement).value = emoji;
                                                                // 更新選中狀態
                                                                document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('bg-orange-500'));
                                                                (e.target as HTMLElement).classList.add('bg-orange-500');
                                                            }
                                                        });
                                                    });

                                                    // 綁定刪除事件
                                                    document.querySelectorAll('.cat-del').forEach(btn => {
                                                        btn.addEventListener('click', async (e) => {
                                                            const id = (e.target as HTMLElement).dataset.id;
                                                            currentCats = currentCats.filter(c => c.id !== id);
                                                            if (currentClassId) {
                                                                await updateClassCategories(currentClassId, currentCats);
                                                                setCategories(currentCats);
                                                                Swal.update({ html: buildCategoryHtml(currentCats) });
                                                                // 重新綁定事件
                                                                document.querySelectorAll('.emoji-btn').forEach(btn2 => {
                                                                    btn2.addEventListener('click', (e2) => {
                                                                        const emoji = (e2.target as HTMLElement).dataset.emoji;
                                                                        if (emoji) {
                                                                            (document.getElementById('cat-icon') as HTMLInputElement).value = emoji;
                                                                            document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('bg-orange-500'));
                                                                            (e2.target as HTMLElement).classList.add('bg-orange-500');
                                                                        }
                                                                    });
                                                                });
                                                                document.querySelectorAll('.cat-del').forEach(btn2 => {
                                                                    btn2.addEventListener('click', async (e2) => {
                                                                        const id2 = (e2.target as HTMLElement).dataset.id;
                                                                        currentCats = currentCats.filter(c => c.id !== id2);
                                                                        if (currentClassId) {
                                                                            await updateClassCategories(currentClassId, currentCats);
                                                                            setCategories(currentCats);
                                                                        }
                                                                    });
                                                                });
                                                            }
                                                        });
                                                    });
                                                },
                                                preConfirm: () => {
                                                    const icon = (document.getElementById('cat-icon') as HTMLInputElement)?.value || '📦';
                                                    const name = (document.getElementById('cat-name') as HTMLInputElement)?.value;
                                                    if (!name) {
                                                        Swal.showValidationMessage('請輸入分類名稱');
                                                        return false;
                                                    }
                                                    return { icon, name };
                                                }
                                            });

                                            if (result.isConfirmed && result.value && currentClassId) {
                                                const newCat: CategoryItem = {
                                                    id: `cat-${Date.now()}`,
                                                    name: result.value.name,
                                                    icon: result.value.icon,
                                                    order: currentCats.length + 1
                                                };
                                                const updatedCats = [...currentCats, newCat];
                                                await updateClassCategories(currentClassId, updatedCats);
                                                setCategories(updatedCats);
                                                Swal.fire({
                                                    title: '已新增分類',
                                                    icon: 'success',
                                                    timer: 1500,
                                                    showConfirmButton: false,
                                                    background: '#1f2937',
                                                    color: '#fff'
                                                });
                                            }
                                        }}
                                        className="bg-purple-600 hover:bg-purple-500 text-white text-sm px-4 py-2 rounded-lg font-bold shadow flex items-center gap-1"
                                    >
                                        <Tag className="w-4 h-4" />
                                        分類
                                    </button>
                                    {/* 新增品項按鈕 */}
                                    <button
                                        onClick={async () => {
                                            const categoryOptions = categories.map(c =>
                                                `<option value="${c.id}">${c.icon} ${c.name}</option>`
                                            ).join('');

                                            const { value } = await Swal.fire({
                                                title: '新增品項',
                                                html: `
                                                <input id="s-n" class="swal2-input" placeholder="品名">
                                                <input id="s-p" type="number" class="swal2-input" placeholder="價格">
                                                <input id="s-s" type="number" class="swal2-input" placeholder="庫存">
                                                <select id="s-c" class="swal2-input">
                                                    ${categoryOptions}
                                                </select>
                                            `,
                                                focusConfirm: false,
                                                background: '#1f2937',
                                                color: '#fff',
                                                preConfirm: () => ({
                                                    name: (document.getElementById('s-n') as HTMLInputElement).value,
                                                    price: (document.getElementById('s-p') as HTMLInputElement).value,
                                                    stock: (document.getElementById('s-s') as HTMLInputElement).value,
                                                    category: (document.getElementById('s-c') as HTMLSelectElement).value,
                                                }),
                                            });
                                            if (value?.name && value?.price && currentClassId) {
                                                await addClassMenuItem(currentClassId, value.name, parseInt(value.price), parseInt(value.stock) || 0, value.category || 'main');
                                                loadInventory();
                                            }
                                        }}
                                        className="bg-green-600 hover:bg-green-500 text-white text-sm px-4 py-2 rounded-lg font-bold shadow flex items-center gap-1"
                                    >
                                        <Plus className="w-4 h-4" />
                                        新增
                                    </button>
                                    <button
                                        onClick={loadInventory}
                                        className="text-gray-400 hover:text-white text-sm bg-gray-800 px-4 py-2 rounded-lg border border-gray-700"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-lg overflow-hidden">
                                <table className="w-full text-left text-gray-300">
                                    <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                                        <tr>
                                            <th className="px-3 py-3 w-16">圖片</th>
                                            <th className="px-4 py-3">品項 (價格)</th>
                                            <th className="px-2 py-3 text-center">分類</th>
                                            <th className="px-2 py-3 text-center">目前庫存</th>
                                            <th className="px-4 py-3 text-center">快速調整</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {menuItems.map(item => (
                                            <tr key={item.id} className="border-b border-gray-700 hover:bg-gray-700/50 transition">
                                                {/* 圖片欄 */}
                                                <td className="px-3 py-2">
                                                    <div className="relative group">
                                                        {item.imageUrl ? (
                                                            <div className="relative">
                                                                <img
                                                                    src={item.imageUrl}
                                                                    alt={item.name}
                                                                    className="w-12 h-12 object-cover rounded-lg border border-gray-600"
                                                                />
                                                                {/* 懸停時顯示操作按鈕 */}
                                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
                                                                    <label className="cursor-pointer p-1 bg-blue-600 rounded hover:bg-blue-500 transition">
                                                                        <Upload className="w-3 h-3 text-white" />
                                                                        <input
                                                                            type="file"
                                                                            accept="image/*"
                                                                            className="hidden"
                                                                            onChange={async (e) => {
                                                                                const file = e.target.files?.[0];
                                                                                if (file && currentClassId) {
                                                                                    Swal.fire({ title: '上傳中...', allowOutsideClick: false, didOpen: () => Swal.showLoading(), background: '#1f2937', color: '#fff' });
                                                                                    await uploadMenuItemImage(currentClassId, item.id, file);
                                                                                    Swal.close();
                                                                                    loadInventory();
                                                                                }
                                                                            }}
                                                                        />
                                                                    </label>
                                                                    <button
                                                                        onClick={async () => {
                                                                            const result = await Swal.fire({
                                                                                title: '移除圖片？',
                                                                                icon: 'warning',
                                                                                showCancelButton: true,
                                                                                confirmButtonColor: '#d33',
                                                                                cancelButtonText: '取消',
                                                                                confirmButtonText: '移除',
                                                                                background: '#1f2937',
                                                                                color: '#fff',
                                                                            });
                                                                            if (result.isConfirmed && currentClassId) {
                                                                                await deleteMenuItemImage(currentClassId, item.id, item.imageUrl);
                                                                                loadInventory();
                                                                            }
                                                                        }}
                                                                        className="p-1 bg-red-600 rounded hover:bg-red-500 transition"
                                                                    >
                                                                        <X className="w-3 h-3 text-white" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <label className="w-12 h-12 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center cursor-pointer hover:border-orange-500 hover:bg-gray-700/50 transition">
                                                                <ImagePlus className="w-5 h-5 text-gray-500" />
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    className="hidden"
                                                                    onChange={async (e) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (file && currentClassId) {
                                                                            Swal.fire({ title: '上傳中...', allowOutsideClick: false, didOpen: () => Swal.showLoading(), background: '#1f2937', color: '#fff' });
                                                                            await uploadMenuItemImage(currentClassId, item.id, file);
                                                                            Swal.close();
                                                                            loadInventory();
                                                                        }
                                                                    }}
                                                                />
                                                            </label>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 font-bold text-gray-200">
                                                    <span>{item.name}</span>
                                                    <span className="text-xs text-gray-500 ml-2">(${item.price})</span>
                                                </td>
                                                {/* 分類欄 - 點擊可修改 */}
                                                <td className="px-2 py-3 text-center">
                                                    <button
                                                        onClick={async () => {
                                                            const categoryOptions = categories.map(c =>
                                                                `<option value="${c.id}" ${item.category === c.id ? 'selected' : ''}>${c.icon} ${c.name}</option>`
                                                            ).join('');

                                                            const { value } = await Swal.fire({
                                                                title: '選擇分類',
                                                                html: `<select id="cat-select" class="swal2-input" style="background-color: #374151; color: #fff; border-color: #4b5563;">${categoryOptions}</select>`,
                                                                showCancelButton: true,
                                                                confirmButtonText: '確認',
                                                                cancelButtonText: '取消',
                                                                background: '#1f2937',
                                                                color: '#fff',
                                                                preConfirm: () => (document.getElementById('cat-select') as HTMLSelectElement).value
                                                            });

                                                            if (value && currentClassId && value !== item.category) {
                                                                await updateClassMenuItem(currentClassId, item.id, { category: value });
                                                                loadInventory();
                                                            }
                                                        }}
                                                        className="inline-flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs transition"
                                                        title="點擊更改分類"
                                                    >
                                                        {categories.find(c => c.id === item.category)?.icon || '📦'}
                                                        <span className="text-gray-300">
                                                            {categories.find(c => c.id === item.category)?.name || item.category}
                                                        </span>
                                                    </button>
                                                </td>
                                                <td className="px-2 py-3 text-center">
                                                    <input
                                                        type="number"
                                                        value={item.stock}
                                                        onChange={async e => {
                                                            if (!currentClassId) return;
                                                            const newQty = parseInt(e.target.value) || 0;
                                                            await updateClassStock(currentClassId, item.id, newQty);
                                                            loadInventory();
                                                        }}
                                                        className={`bg-transparent border-b-2 border-gray-600 text-center w-16 font-bold text-lg focus:outline-none focus:border-orange-500 ${item.stock <= 5 ? 'text-red-500' : 'text-green-400'
                                                            }`}
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex justify-center gap-2">
                                                        <button
                                                            onClick={async () => {
                                                                if (!currentClassId) return;
                                                                await updateClassStock(currentClassId, item.id, Math.max(0, item.stock - 1));
                                                                loadInventory();
                                                            }}
                                                            className="bg-gray-700 hover:bg-gray-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow"
                                                        >
                                                            <Minus className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                if (!currentClassId) return;
                                                                await updateClassStock(currentClassId, item.id, item.stock + 1);
                                                                loadInventory();
                                                            }}
                                                            className="bg-gray-700 hover:bg-gray-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                if (!currentClassId) return;
                                                                await updateClassStock(currentClassId, item.id, item.stock + 10);
                                                                loadInventory();
                                                            }}
                                                            className="bg-gray-700 hover:bg-gray-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow text-xs"
                                                        >
                                                            +10
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )
                }

                {/* Owner Dashboard Tab */}
                {
                    activeTab === 'dashboard' && isOwner && (
                        <div className="max-w-7xl mx-auto">
                            <OwnerDashboard />
                        </div>
                    )
                }

                {/* Stats Tab */}
                {
                    activeTab === 'stats' && stats && (
                        <div className="max-w-6xl mx-auto">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-lg">
                                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">總營收</p>
                                    <p className="text-3xl md:text-4xl font-black text-green-400 mt-2 flex items-center gap-2">
                                        <DollarSign className="w-8 h-8" />
                                        {stats.revenue.toLocaleString()}
                                    </p>
                                </div>
                                <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-lg">
                                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">總單量</p>
                                    <p className="text-4xl font-black text-blue-400 mt-2 flex items-center gap-2">
                                        <ShoppingBag className="w-8 h-8" />
                                        {stats.orderCount}
                                    </p>
                                </div>
                                <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-lg">
                                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">平均客單價</p>
                                    <p className="text-3xl md:text-4xl font-black text-purple-400 mt-2 flex items-center gap-2">
                                        <TrendingUp className="w-8 h-8" />
                                        ${stats.orderCount > 0 ? Math.round(stats.revenue / stats.orderCount) : 0}
                                    </p>
                                </div>
                            </div>

                            {/* Charts */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                                <div className="lg:col-span-2 bg-gray-800 p-4 md:p-6 rounded-2xl border border-gray-700 shadow-lg">
                                    <h3 className="font-bold text-gray-200 mb-4">熱銷排行</h3>
                                    <div className="h-64 md:h-72">
                                        <Bar
                                            data={{
                                                labels: stats.ranking.slice(0, 10).map((i: any) => i.name),
                                                datasets: [{
                                                    data: stats.ranking.slice(0, 10).map((i: any) => i.qty),
                                                    backgroundColor: 'rgba(249, 115, 22, 0.7)',
                                                    borderRadius: 4,
                                                }],
                                            }}
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                plugins: { legend: { display: false } },
                                                scales: {
                                                    y: { grid: { color: 'rgba(255,255,255,0.05)' } },
                                                    x: { grid: { display: false } },
                                                },
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="lg:col-span-1 bg-gray-800 p-4 md:p-6 rounded-2xl border border-gray-700 shadow-lg">
                                    <h3 className="font-bold text-gray-200 mb-4">銷售佔比</h3>
                                    <div className="h-64">
                                        <Doughnut
                                            data={{
                                                labels: stats.ranking.slice(0, 5).map((i: any) => i.name),
                                                datasets: [{
                                                    data: stats.ranking.slice(0, 5).map((i: any) => i.qty),
                                                    backgroundColor: ['#f97316', '#3b82f6', '#10b981', '#a855f7', '#ec4899'],
                                                    borderWidth: 0,
                                                }],
                                            }}
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                cutout: '70%',
                                                plugins: {
                                                    legend: {
                                                        position: 'bottom',
                                                        labels: { color: '#9ca3af', boxWidth: 10 },
                                                    },
                                                },
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Ranking Table */}
                            <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-lg overflow-hidden">
                                <div className="p-4 border-b border-gray-700 bg-gray-800/50">
                                    <h3 className="font-bold text-gray-200">詳細銷售報表</h3>
                                </div>
                                <table className="w-full text-sm text-left text-gray-400">
                                    <thead className="text-xs text-gray-300 uppercase bg-gray-700/50">
                                        <tr>
                                            <th className="px-6 py-3">排名</th>
                                            <th className="px-6 py-3">品項名稱</th>
                                            <th className="px-6 py-3 text-right">銷售份數</th>
                                            <th className="px-6 py-3 text-right">銷售佔比</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.ranking.map((item: any, idx: number) => {
                                            const total = stats.ranking.reduce((a: number, c: any) => a + c.qty, 0);
                                            return (
                                                <tr key={idx} className="border-b border-gray-700 hover:bg-gray-700/50">
                                                    <td className="px-6 py-4 font-mono text-gray-500">#{idx + 1}</td>
                                                    <td className="px-6 py-4 font-bold text-gray-200">{item.name}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="bg-gray-700 text-orange-400 px-2 py-1 rounded font-bold">
                                                            {item.qty}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-gray-500">
                                                        {total > 0 ? ((item.qty / total) * 100).toFixed(1) : 0}%
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )
                }
            </main >
        </div >
    );
}

export default KitchenApp;
