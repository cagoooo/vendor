import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useClassOrders } from '../../hooks/useClassOrders';
import { useAuth } from '../../contexts/AuthContext';
import {
    updateClassOrderStatus,
    cancelClassOrder,
    getClassMenu,
    updateClassStock,
    addClassMenuItem,
    getClassStats,
    setClassSystemConfig,
    clearClassOrders,
    getAllKitchens,
    type Kitchen
} from '../../services/classApi';
import { OwnerDashboard } from '../../components/OwnerDashboard';
import {
    Flame, RefreshCw, Settings, Trash2,
    ChefHat, Package, PieChart, Clock, Plus, Minus,
    DollarSign, ShoppingBag, TrendingUp, LogOut, LayoutDashboard,
    ChevronDown, Store
} from 'lucide-react';
import Swal from 'sweetalert2';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

type Tab = 'orders' | 'inventory' | 'stats' | 'dashboard';

export function KitchenApp() {
    const { profile, logout, isOwner, currentClassId: authClassId } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('orders');
    const [isShopOpen, setIsShopOpen] = useState(true);
    const [waitTime, setWaitTime] = useState(15);
    const [menuItems, setMenuItems] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [localCompletedSet, setLocalCompletedSet] = useState<Set<string>>(new Set());
    const audioRef = useRef<HTMLAudioElement>(null);
    const lastPendingCount = useRef(0);

    // 班級切換功能（只有 owner 可用）
    const [kitchens, setKitchens] = useState<Kitchen[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
    const [showClassDropdown, setShowClassDropdown] = useState(false);

    // 實際使用的 classId：owner 可以切換，其他人使用自己的班級
    const currentClassId = isOwner ? (selectedClassId || authClassId) : authClassId;

    // 載入所有班級（owner 專用）
    useEffect(() => {
        if (isOwner) {
            loadKitchens();
        }
    }, [isOwner]);

    const loadKitchens = async () => {
        const result = await getAllKitchens();
        if (result.status === 'success' && result.data) {
            setKitchens(result.data);
            // 如果還沒選擇班級，預設選第一個
            if (!selectedClassId && result.data.length > 0) {
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
            audioRef.current?.play().catch(() => { });
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
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            background: '#1f2937',
            color: '#fff',
        });
        if (result.isConfirmed) {
            await clearClassOrders(currentClassId);
            setLocalCompletedSet(new Set());
            refetch();
            loadStats();
        }
    };



    return (
        <div className="min-h-screen bg-gray-900 text-gray-100">
            <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" preload="auto" />

            {/* Header */}
            <header className="bg-gray-800 border-b border-gray-700 p-4 shadow-lg sticky top-0 z-20">
                <div className="flex flex-wrap justify-between items-center gap-4 max-w-7xl mx-auto">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl md:text-2xl font-black text-orange-500 tracking-wider flex items-center gap-2">
                            <Flame className="w-6 h-6" />
                            KITCHEN
                        </h1>

                        {/* 班級切換（只有 owner 可見）*/}
                        {isOwner && kitchens.length > 0 && (
                            <div className="relative">
                                <button
                                    onClick={() => setShowClassDropdown(!showClassDropdown)}
                                    className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white px-3 py-1.5 rounded-lg font-bold text-sm shadow-lg"
                                >
                                    <Store className="w-4 h-4" />
                                    <span>{kitchens.find(k => k.classId === currentClassId)?.className || '選擇班級'}</span>
                                    <ChevronDown className={`w-4 h-4 transition ${showClassDropdown ? 'rotate-180' : ''}`} />
                                </button>
                                {showClassDropdown && (
                                    <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 min-w-[180px] py-1">
                                        {kitchens.map(k => (
                                            <button
                                                key={k.classId}
                                                onClick={() => {
                                                    setSelectedClassId(k.classId);
                                                    setShowClassDropdown(false);
                                                    setLocalCompletedSet(new Set()); // 切換班級時清除本地狀態
                                                }}
                                                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-700 flex items-center justify-between ${k.classId === currentClassId ? 'text-orange-400 font-bold' : 'text-gray-300'
                                                    }`}
                                            >
                                                <span>{k.className}</span>
                                                {k.isOpen ? (
                                                    <span className="text-[10px] bg-green-600 px-1.5 rounded text-white">營業</span>
                                                ) : (
                                                    <span className="text-[10px] bg-gray-600 px-1.5 rounded text-gray-300">休息</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 營業狀態 */}
                        <div className="flex items-center gap-2 bg-gray-700 rounded-full px-3 py-1.5">
                            <button
                                onClick={handleToggleShop}
                                className={`w-10 h-5 rounded-full relative transition ${isShopOpen ? 'bg-green-500' : 'bg-gray-600'}`}
                            >
                                <span className={`absolute w-4 h-4 bg-white rounded-full top-0.5 transition ${isShopOpen ? 'right-0.5' : 'left-0.5'}`} />
                            </button>
                            <span className={`text-xs font-bold ${isShopOpen ? 'text-green-400' : 'text-gray-400'}`}>
                                {isShopOpen ? '營業中' : '已暫停'}
                            </span>
                        </div>

                        {/* 等待時間 */}
                        <div className="flex items-center gap-1 bg-gray-700 px-2 py-1 rounded-lg">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <input
                                type="number"
                                value={waitTime}
                                onChange={e => handleWaitTimeChange(parseInt(e.target.value) || 15)}
                                className="bg-transparent w-8 text-center text-white text-xs font-bold focus:outline-none"
                            />
                            <span className="text-xs text-gray-500">分</span>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex bg-gray-700 rounded-lg p-1 gap-1">
                        {isOwner && (
                            <button
                                onClick={() => setActiveTab('dashboard')}
                                className={`px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 transition ${activeTab === 'dashboard' ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                <LayoutDashboard className="w-4 h-4" />
                                總覽
                            </button>
                        )}
                        <button
                            onClick={() => setActiveTab('orders')}
                            className={`px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 transition ${activeTab === 'orders' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            <ChefHat className="w-4 h-4" />
                            接單
                        </button>
                        <button
                            onClick={() => setActiveTab('inventory')}
                            className={`px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 transition ${activeTab === 'inventory' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            <Package className="w-4 h-4" />
                            庫存
                        </button>
                        <button
                            onClick={() => setActiveTab('stats')}
                            className={`px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 transition ${activeTab === 'stats' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            <PieChart className="w-4 h-4" />
                            戰情
                        </button>
                    </div>

                    {/* User Profile & Settings */}
                    <div className="flex items-center gap-2">
                        {/* User Info */}
                        {profile && (
                            <div className="hidden sm:flex items-center gap-2 bg-gray-700 rounded-lg px-3 py-1.5">
                                {profile.photoURL ? (
                                    <img src={profile.photoURL} alt="" className="w-6 h-6 rounded-full" />
                                ) : (
                                    <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-xs font-bold text-white">
                                        {profile.name?.charAt(0) || 'U'}
                                    </div>
                                )}
                                <span className="text-sm text-gray-300">{profile.name || profile.email}</span>
                                {profile.className && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-blue-600 text-white">
                                        {profile.className}
                                    </span>
                                )}
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isOwner ? 'bg-orange-500 text-white' : 'bg-gray-600 text-gray-300'
                                    }`}>
                                    {isOwner ? '店長' : '員工'}
                                </span>
                            </div>
                        )}

                        {/* Admin Link (owner only) - 紫色漸層帶文字 */}
                        {isOwner && (
                            <Link
                                to="/admin"
                                className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white px-3 py-2 rounded-lg transition flex items-center gap-2 font-bold text-sm shadow-lg shadow-purple-500/20"
                            >
                                <Settings className="w-4 h-4" />
                                <span className="hidden sm:inline">管理中心</span>
                            </Link>
                        )}

                        {/* Settings Button - 灰色齒輪 */}
                        <button
                            onClick={() => {
                                Swal.fire({
                                    title: '管理設定',
                                    html: `
                      <div class="space-y-3">
                        ${isOwner ? `<button id="clear-btn" class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg flex items-center justify-center gap-2">
                          <i class="fas fa-trash-alt"></i> 清除所有資料
                        </button>` : ''}
                        <button id="logout-btn" class="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg flex items-center justify-center gap-2">
                          <i class="fas fa-sign-out-alt"></i> 登出
                        </button>
                      </div>
                    `,
                                    showConfirmButton: false,
                                    showCloseButton: true,
                                    background: '#1f2937',
                                    color: '#fff',
                                    didOpen: () => {
                                        document.getElementById('clear-btn')?.addEventListener('click', () => {
                                            Swal.close();
                                            handleClearAll();
                                        });
                                        document.getElementById('logout-btn')?.addEventListener('click', () => {
                                            Swal.close();
                                            logout();
                                        });
                                    },
                                });
                            }}
                            className="text-gray-400 hover:text-white p-2 transition"
                            title="設定"
                        >
                            <Settings className="w-5 h-5" />
                        </button>

                        {/* Logout Button - 紅色文字連結 */}
                        <button
                            onClick={logout}
                            className="text-gray-400 hover:text-red-400 p-2 transition flex items-center gap-1"
                            title="登出"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="p-4 md:p-6 max-w-7xl mx-auto pb-24">
                {/* Orders Tab */}
                {activeTab === 'orders' && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-gray-300 flex items-center gap-2">
                                排隊中
                                <span className="bg-red-600 text-white px-2 py-0.5 rounded-full text-sm">
                                    {filteredOrders.length}
                                </span>
                            </h2>
                            <button
                                onClick={refetch}
                                className="text-gray-400 hover:text-white text-sm bg-gray-800 px-4 py-2 rounded-lg border border-gray-700 flex items-center gap-1"
                            >
                                <RefreshCw className="w-4 h-4" />
                                重整
                            </button>
                        </div>

                        {filteredOrders.length === 0 ? (
                            <div className="text-center py-20 text-gray-600">
                                <ChefHat className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                <p>無訂單</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {filteredOrders.map((order) => {
                                    const isPrep = order.status === 'Preparing';
                                    const isDone = order.status === 'Completed';

                                    let cardStyle = 'border-l-gray-600 bg-gray-800';
                                    let btnStyle = 'bg-blue-600 hover:bg-blue-500';
                                    let btnText = '👨‍🍳 開始製作';
                                    let nextStatus = 'Preparing';

                                    if (isPrep) {
                                        cardStyle = 'border-l-orange-500 bg-gray-800 shadow-[0_0_15px_rgba(249,115,22,0.15)]';
                                        btnStyle = 'bg-green-600 hover:bg-green-500';
                                        btnText = '🍽️ 製作完成';
                                        nextStatus = 'Completed';
                                    } else if (isDone) {
                                        cardStyle = 'border-l-green-500 bg-green-900/30 shadow-[0_0_20px_rgba(16,185,129,0.3)]';
                                        btnStyle = 'bg-emerald-600 hover:bg-emerald-500 ring-2 ring-emerald-400 ring-offset-2 ring-offset-gray-800';
                                        btnText = `💰 收款 $${order.total || order.totalPrice}`;
                                        nextStatus = 'Paid';
                                    }

                                    return (
                                        <div
                                            key={order.id}
                                            className={`rounded-xl p-4 shadow-lg border-l-[6px] ${cardStyle} transition-all`}
                                        >
                                            {/* Header */}
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="pr-12">
                                                    <h3 className="text-lg font-bold text-white truncate">{order.info}</h3>
                                                    <span className="text-xs text-gray-400 font-mono">{order.time}</span>
                                                    {isPrep && (
                                                        <span className="ml-2 text-[10px] bg-orange-600 px-1 rounded animate-pulse">製作中</span>
                                                    )}
                                                    {isDone && (
                                                        <span className="ml-2 text-[10px] bg-green-600 px-1 rounded font-bold">待取餐</span>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[10px] text-gray-400">NO.</div>
                                                    <div className="text-xl font-bold text-white" style={{ fontFamily: "'Courier New', monospace" }}>
                                                        {order.id.split('-')[1]}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Note */}
                                            {order.note && (
                                                <div className="bg-red-900/30 text-red-300 text-xs px-2 py-1 rounded mb-2 inline-block">
                                                    {order.note}
                                                </div>
                                            )}

                                            {/* Items */}
                                            <div className="bg-gray-900/50 rounded-lg p-3 mb-4 space-y-1 max-h-32 overflow-y-auto border border-gray-700/50">
                                                {order.items.map((item, idx) => (
                                                    <div key={idx} className="flex justify-between text-sm border-b border-gray-700/50 pb-1">
                                                        <span className="text-gray-300">{item.name}</span>
                                                        <span className="font-bold text-orange-400">x{item.quantity}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2 pt-3 border-t border-gray-700">
                                                <span className="font-bold text-xl text-gray-300 w-16">
                                                    ${order.total || order.totalPrice}
                                                </span>
                                                <button
                                                    onClick={() => handleStatusUpdate(order.id, nextStatus, order.total || order.totalPrice)}
                                                    className={`flex-1 ${btnStyle} text-white px-3 py-3 rounded-lg font-bold shadow transition active:scale-95 text-sm`}
                                                >
                                                    {btnText}
                                                </button>
                                                <button
                                                    onClick={() => handleCancelOrder(order.id)}
                                                    className="bg-gray-700 hover:bg-red-600 text-gray-400 hover:text-white px-3 py-3 rounded-lg transition"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Inventory Tab */}
                {activeTab === 'inventory' && (
                    <div className="max-w-4xl mx-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-gray-300">庫存與菜單</h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={async () => {
                                        const { value } = await Swal.fire({
                                            title: '新增品項',
                                            html: `
                        <input id="s-n" class="swal2-input" placeholder="品名">
                        <input id="s-p" type="number" class="swal2-input" placeholder="價格">
                        <input id="s-s" type="number" class="swal2-input" placeholder="庫存">
                      `,
                                            focusConfirm: false,
                                            background: '#1f2937',
                                            color: '#fff',
                                            preConfirm: () => ({
                                                name: (document.getElementById('s-n') as HTMLInputElement).value,
                                                price: (document.getElementById('s-p') as HTMLInputElement).value,
                                                stock: (document.getElementById('s-s') as HTMLInputElement).value,
                                            }),
                                        });
                                        if (value?.name && value?.price && currentClassId) {
                                            await addClassMenuItem(currentClassId, value.name, parseInt(value.price), parseInt(value.stock) || 0);
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
                                        <th className="px-4 py-3">品項 (價格)</th>
                                        <th className="px-2 py-3 text-center">目前庫存</th>
                                        <th className="px-4 py-3 text-center">快速調整</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {menuItems.map(item => (
                                        <tr key={item.id} className="border-b border-gray-700 hover:bg-gray-700/50 transition">
                                            <td className="px-4 py-3 font-bold text-gray-200">
                                                <span>{item.name}</span>
                                                <span className="text-xs text-gray-500 ml-2">(${item.price})</span>
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
                )}

                {/* Owner Dashboard Tab */}
                {activeTab === 'dashboard' && isOwner && (
                    <div className="max-w-7xl mx-auto">
                        <OwnerDashboard />
                    </div>
                )}

                {/* Stats Tab */}
                {activeTab === 'stats' && stats && (
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
                )}
            </main>
        </div>
    );
}

export default KitchenApp;
