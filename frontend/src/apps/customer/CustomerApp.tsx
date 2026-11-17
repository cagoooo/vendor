import { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useClassMenu } from '../../hooks/useClassMenu';
import { useCartStore, useOrderHistoryStore } from '../../stores';
import { placeClassOrder, checkClassOrderStatus, getClassCategories } from '../../services/classApi';
import type { CategoryItem } from '../../types';
import { useOfflineSync, ACTION_TYPES } from '../../hooks/useOfflineSync';
import { OfflineIndicator } from '../../components/OfflineIndicator';
import { MenuCard } from '../../components/order/MenuCard';
import { CartDrawer } from '../../components/order/CartDrawer';
import { OrderHistoryModal } from '../../components/order/OrderHistoryModal';
import { ShareModal } from '../../components/share/ShareModal';
import { InstallBanner } from '../../components/pwa/InstallBanner';
import { SiteCredit } from '../../components/SiteCredit';
import { OrderGuideAnimation } from '../../components/animations';
import { rateLimiter } from '../../services/rateLimiter';
import { validateOrderInput } from '../../utils/validation';
import { ShoppingCart, Receipt, Clock, Loader2, Store, Search, Utensils, QrCode } from 'lucide-react';
import Swal from 'sweetalert2';

type Category = 'all' | string; // 支援動態分類

export function CustomerApp() {
    // 從 URL 讀取 classId（支援 /order/:classId 或 ?class=xxx）
    const { classId: paramClassId } = useParams<{ classId?: string }>();
    const [searchParams] = useSearchParams();
    const classId = paramClassId || searchParams.get('class') || 'default';

    const { menuItems, trendingItems, systemConfig, isLoading, error } = useClassMenu(classId);
    const cart = useCartStore();
    const orderHistory = useOrderHistoryStore();

    const [category, setCategory] = useState<Category>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showCart, setShowCart] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showShare, setShowShare] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [showOrderGuide, setShowOrderGuide] = useState(false);

    // 離線同步
    const { isOnline, pendingCount, queueAction } = useOfflineSync();

    // 追蹤「請取餐」訂單數量，用於自動彈出
    const prevReadyCountRef = useRef(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // 生成分享連結
    const shareUrl = typeof window !== 'undefined'
        ? `${window.location.origin}${import.meta.env.BASE_URL}order/${classId}`
        : '';

    // 後台輪詢訂單狀態，當有新的「請取餐」訂單時自動彈出
    useEffect(() => {
        const activeOrders = orderHistory.getActiveOrders();
        if (activeOrders.length === 0) return;

        const pollOrderStatus = async () => {
            // 按 classId 分組查詢
            const ordersByClass = new Map<string, string[]>();
            for (const order of activeOrders) {
                const cid = order.classId || 'default';
                if (!ordersByClass.has(cid)) {
                    ordersByClass.set(cid, []);
                }
                ordersByClass.get(cid)!.push(order.id);
            }

            // 查詢並更新狀態
            for (const [cid, orderIds] of ordersByClass.entries()) {
                const result = await checkClassOrderStatus(cid, orderIds);
                if (result.status === 'success' && result.data) {
                    // 更新有返回狀態的訂單
                    Object.entries(result.data).forEach(([orderId, status]) => {
                        orderHistory.updateOrderStatus(orderId, status);
                    });

                    // 移除後台已刪除的訂單（不在返回結果中）
                    for (const orderId of orderIds) {
                        if (!(orderId in result.data)) {
                            orderHistory.removeOrder(orderId);
                        }
                    }
                }
            }

            // 檢查是否有新的「請取餐」訂單
            const currentReadyOrders = orderHistory.getActiveOrders().filter(o => o.status === 'Completed');
            if (currentReadyOrders.length > prevReadyCountRef.current) {
                // 有新的請取餐訂單！
                setShowHistory(true); // 自動打開訂單通知

                // 播放音效
                if (!audioRef.current) {
                    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                }
                audioRef.current.play().catch(() => { });
            }
            prevReadyCountRef.current = currentReadyOrders.length;
        };

        // 立即執行一次
        pollOrderStatus();

        // 每 10 秒輪詢一次
        const interval = setInterval(pollOrderStatus, 10000);
        return () => clearInterval(interval);
    }, [orderHistory.orders.length]);

    // 載入班級的自訂分類
    useEffect(() => {
        const loadCategories = async () => {
            const result = await getClassCategories(classId);
            if (result.status === 'success' && result.data) {
                setCategories(result.data);
            }
        };
        loadCategories();
    }, [classId]);

    const filteredMenu = useMemo(() => {
        return menuItems.filter(item => {
            const matchCategory = category === 'all' || item.category === category;
            const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
            return matchCategory && matchSearch;
        });
    }, [menuItems, category, searchQuery]);

    if (systemConfig?.isOpen === false) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center text-white p-8">
                <div className="text-center max-w-md">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-800 flex items-center justify-center border-2 border-gray-700">
                        <Store className="w-12 h-12 text-gray-500" />
                    </div>
                    <h2 className="text-3xl font-black mb-3">目前暫停接單</h2>
                    <p className="text-gray-400 mb-8">廚房忙碌中或已休息，請稍後再來！</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-full font-bold text-lg shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all hover:scale-105"
                    >
                        重新整理
                    </button>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex flex-col items-center justify-center">
                <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-r from-orange-400 to-red-400 animate-pulse" />
                    <Loader2 className="w-10 h-10 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white animate-spin" />
                </div>
                <p className="mt-6 text-gray-600 font-medium animate-pulse">美味準備中...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex flex-col items-center justify-center p-8">
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
                        <span className="text-4xl">😢</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">載入失敗</h2>
                    <p className="text-gray-500 mb-6">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full font-bold shadow-lg"
                    >
                        重試
                    </button>
                </div>
            </div>
        );
    }

    const handleSubmitOrder = async () => {
        // Rate Limiting 檢查
        const rateCheck = rateLimiter.check('order');
        if (!rateCheck.allowed) {
            Swal.fire({
                toast: true,
                position: 'top',
                icon: 'warning',
                title: `請稍後再試 (${rateCheck.retryAfter} 秒)`,
                showConfirmButton: false,
                timer: 3000
            });
            return;
        }

        // Input Validation
        const validation = validateOrderInput({
            customerName: cart.customerName,
            customerClass: cart.customerClass,
            note: cart.note,
        });

        if (!validation.valid) {
            const firstError = Object.values(validation.errors)[0];
            Swal.fire({
                toast: true,
                position: 'top',
                icon: 'warning',
                title: firstError,
                showConfirmButton: false,
                timer: 2000
            });
            return;
        }

        if (cart.items.length === 0) {
            Swal.fire({ icon: 'info', title: '購物車是空的', text: '請先點選餐點喔！', confirmButtonColor: '#f97316' });
            return;
        }

        // 記錄請求（通過驗證後）
        rateLimiter.record('order');

        const result = await Swal.fire({
            title: '確認訂單',
            html: `
        <div class="text-left">
          <div class="bg-gray-50 rounded-xl p-4 mb-4">
            <p class="font-bold text-lg text-gray-800">${cart.customerClass} ${cart.customerName}</p>
            ${cart.note ? `<p class="text-sm text-gray-500 mt-1">📝 ${cart.note}</p>` : ''}
          </div>
          <div class="space-y-2 mb-4">
            ${cart.items.map(item => `
              <div class="flex justify-between py-2 border-b border-gray-100">
                <span class="text-gray-700">${item.name} <span class="text-orange-500 font-bold">×${item.quantity}</span></span>
                <span class="font-bold">$${item.quantity * item.price}</span>
              </div>
            `).join('')}
          </div>
          <div class="flex justify-between items-center pt-3 border-t-2 border-orange-200">
            <span class="text-gray-600">總金額</span>
            <span class="text-3xl font-black text-orange-500">$${cart.getTotal()}</span>
          </div>
        </div>
      `,
            showCancelButton: true,
            confirmButtonColor: '#f97316',
            cancelButtonColor: '#9ca3af',
            confirmButtonText: '✓ 確定送出',
            cancelButtonText: '再看看',
            reverseButtons: true,
        });

        if (!result.isConfirmed) return;

        setIsSubmitting(true);

        try {
            // 離線模式：暫存訂單到本地
            if (!isOnline) {
                queueAction(ACTION_TYPES.PLACE_ORDER, {
                    classId,
                    customerClass: cart.customerClass,
                    customerName: cart.customerName,
                    items: cart.items.map(item => ({
                        name: item.name,
                        quantity: item.quantity,
                        price: item.price,
                        menuItemId: item.menuItemId,
                    })),
                    totalPrice: cart.getTotal(),
                    note: cart.note,
                });

                cart.clearCart();
                setShowCart(false);

                await Swal.fire({
                    icon: 'info',
                    title: '📴 離線訂單已暫存',
                    html: `
            <div class="text-center">
              <p class="text-gray-500 mb-4">網路恢復後將自動送出</p>
              <div class="inline-block bg-gray-600 text-white px-6 py-3 rounded-xl">
                <span class="text-lg font-bold">待處理訂單: ${pendingCount + 1}</span>
              </div>
              <p class="text-sm text-gray-400 mt-4">請保持此頁面開啟</p>
            </div>
          `,
                    confirmButtonText: '了解',
                    confirmButtonColor: '#1f2937',
                });
                return;
            }

            const response = await placeClassOrder(
                classId,
                cart.customerClass,
                cart.customerName,
                cart.items.map(item => ({
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                    menuItemId: item.menuItemId,
                })),
                cart.getTotal(),
                cart.note
            );

            if (response.status === 'success' && response.orderId) {
                orderHistory.addOrder({
                    id: response.orderId,
                    classId: classId, // 儲存班級 ID 以便訂單狀態查詢
                    customerInfo: { class: cart.customerClass, name: cart.customerName },
                    items: cart.items.map(item => ({
                        menuItemId: item.menuItemId,
                        name: item.name,
                        quantity: item.quantity,
                        price: item.price,
                    })),
                    totalPrice: cart.getTotal(),
                    note: cart.note,
                    status: 'Pending',
                    time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
                });

                cart.clearCart();
                setShowCart(false);

                await Swal.fire({
                    icon: 'success',
                    title: '🎉 點餐成功！',
                    html: `
            <div class="text-center">
              <p class="text-gray-500 mb-4">您的取餐號碼</p>
              <div class="inline-block bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-4 rounded-2xl">
                <span class="text-5xl font-black" style="font-family: 'Courier New', monospace;">
                  ${response.orderId.split('-')[1]}
                </span>
              </div>
              <p class="text-sm text-gray-400 mt-4">請留意叫號螢幕或點擊右上角追蹤訂單</p>
            </div>
          `,
                    confirmButtonText: '繼續點餐',
                    confirmButtonColor: '#1f2937',
                });

                // 觸發引導動畫，指向「我的訂單」按鈕
                setShowOrderGuide(true);
            } else {
                Swal.fire({ icon: 'error', title: '訂單失敗', text: response.message || '請稍後再試' });
            }
        } catch {
            Swal.fire({ icon: 'error', title: '系統錯誤', text: '請重新整理頁面後再試' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const activeOrderCount = orderHistory.getActiveOrders().length;

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-orange-50/30 pb-28">
            {/* 訂單引導動畫 */}
            <OrderGuideAnimation
                isActive={showOrderGuide}
                onComplete={() => setShowOrderGuide(false)}
            />

            {/* 離線指示器 */}
            <OfflineIndicator />

            {/* PWA 安裝提示 */}
            <InstallBanner />
            {/* Hero Banner */}
            <div className="relative min-h-[200px] sm:min-h-[240px] md:min-h-[300px]">
                <div className="absolute inset-0 overflow-hidden">
                    <img
                        src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1200&auto=format&fit=crop"
                        className="w-full h-full object-cover"
                        alt="Food Banner"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
                </div>
                <div className="relative flex flex-col justify-end h-full min-h-[200px] sm:min-h-[240px] md:min-h-[300px] px-4 pb-6 sm:px-6 sm:pb-8 lg:px-8 lg:pb-10">
                    <div className="max-w-4xl mx-auto w-full">
                        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white mb-2 sm:mb-3 flex items-center gap-2 sm:gap-3">
                            <span className="text-3xl sm:text-5xl">🎈</span>
                            <span>校園點餐系統</span>
                        </h1>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                            <span className="text-orange-300 flex items-center gap-1 text-xs sm:text-base">
                                <Utensils className="w-3 h-3 sm:w-4 sm:h-4" />
                                線上點餐
                            </span>
                            <span className="text-white/60 text-xs sm:text-base">•</span>
                            <span className="text-white/80 text-xs sm:text-base">即時叫號</span>
                            {systemConfig?.waitTime && (
                                <span className="bg-white/20 backdrop-blur-sm px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-white text-[10px] sm:text-sm font-medium flex items-center gap-1">
                                    <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                    約 {systemConfig.waitTime} 分鐘
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 右上角按鈕組 */}
            <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-40 flex items-center gap-2">
                {/* 分享按鈕 */}
                <button
                    onClick={() => setShowShare(true)}
                    className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-2.5 rounded-full shadow-lg transition-all hover:shadow-xl hover:scale-105 active:scale-95"
                    title="分享點餐連結"
                >
                    <QrCode className="w-5 h-5" />
                </button>

                {/* 訂單追蹤按鈕 */}
                <button
                    onClick={() => setShowHistory(true)}
                    className="bg-white/95 backdrop-blur-md text-gray-800 pl-3 pr-4 py-2.5 rounded-full shadow-lg border border-gray-200/50 font-bold text-sm flex items-center gap-2 transition-all hover:shadow-xl hover:scale-105 active:scale-95"
                >
                    <div className="relative">
                        <Receipt className="w-5 h-5 text-orange-500" />
                        {activeOrderCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold animate-pulse">
                                {activeOrderCount}
                            </span>
                        )}
                    </div>
                    <span className="hidden sm:inline">我的訂單</span>
                </button>
            </div>

            {/* 主內容區 */}
            <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6">
                {/* 顧客資訊卡片 */}
                <div className="relative -mt-4 sm:-mt-8 md:-mt-10 mb-4">
                    <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-4 md:p-6 border border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl">👋</span>
                            <h2 className="font-bold text-gray-700 text-lg">誰要吃？</h2>
                        </div>

                        {/* 班級與姓名 - 平板以上才水平排列 */}
                        <div className="space-y-3 md:space-y-0 md:flex md:gap-3 mb-3">
                            <div className="md:w-1/3">
                                <label className="text-xs text-gray-400 font-medium mb-1.5 block">班級</label>
                                <input
                                    type="text"
                                    placeholder="如：601"
                                    value={cart.customerClass}
                                    onChange={e => cart.setCustomerInfo(e.target.value, cart.customerName)}
                                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 text-center font-bold text-lg focus:outline-none focus:border-orange-400 focus:bg-white transition placeholder-gray-300"
                                />
                            </div>
                            <div className="md:flex-1">
                                <label className="text-xs text-gray-400 font-medium mb-1.5 block">姓名</label>
                                <input
                                    type="text"
                                    placeholder="你的名字"
                                    value={cart.customerName}
                                    onChange={e => cart.setCustomerInfo(cart.customerClass, e.target.value)}
                                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-lg focus:outline-none focus:border-orange-400 focus:bg-white transition placeholder-gray-300"
                                />
                            </div>
                        </div>

                        {/* 備註欄 */}
                        <div>
                            <label className="text-xs text-gray-400 font-medium mb-1.5 block">備註 (選填)</label>
                            <input
                                type="text"
                                placeholder="例：不要香菜、去冰、加辣..."
                                value={cart.note}
                                onChange={e => cart.setNote(e.target.value)}
                                className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:bg-white transition placeholder-gray-300"
                            />
                        </div>
                    </div>
                </div>

                {/* 搜尋與分類 */}
                <div className="sticky top-0 z-20 bg-gradient-to-b from-gray-50 via-gray-50 to-gray-50/95 backdrop-blur-sm pt-3 pb-3 -mx-3 px-3 sm:-mx-4 sm:px-4">
                    {/* 搜尋框 */}
                    <div className="relative mb-3">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="想吃什麼？"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-white border-2 border-gray-100 rounded-full pl-11 pr-4 py-2.5 sm:py-3 text-sm font-medium focus:outline-none focus:border-orange-400 shadow-sm transition"
                        />
                    </div>

                    {/* 分類Tab */}
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {/* 全部按鈕 */}
                        <button
                            onClick={() => setCategory('all')}
                            className={`whitespace-nowrap px-4 sm:px-5 py-2 rounded-full text-sm font-bold shadow-sm transition-all active:scale-95 ${category === 'all'
                                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-orange-200'
                                : 'bg-white border-2 border-gray-100 text-gray-600 hover:border-orange-200'
                                }`}
                        >
                            🍽️ 全部
                        </button>
                        {/* 動態分類按鈕 */}
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setCategory(cat.id)}
                                className={`whitespace-nowrap px-4 sm:px-5 py-2 rounded-full text-sm font-bold shadow-sm transition-all active:scale-95 ${category === cat.id
                                    ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-orange-200'
                                    : 'bg-white border-2 border-gray-100 text-gray-600 hover:border-orange-200'
                                    }`}
                            >
                                {cat.icon} {cat.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 菜單標題 */}
                <div className="flex justify-between items-end mt-4 mb-3">
                    <h2 className="text-lg sm:text-xl font-black text-gray-800">
                        {category === 'all' ? '所有餐點' : categories.find(c => c.id === category)?.name || '餐點'}
                        <span className="text-sm font-normal text-gray-400 ml-2">({filteredMenu.length})</span>
                    </h2>
                </div>

                {/* 菜單列表 */}
                <div className="space-y-3 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0 pb-4">
                    {filteredMenu.length === 0 ? (
                        <div className="col-span-full text-center py-16">
                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                                <Search className="w-8 h-8 text-gray-300" />
                            </div>
                            <p className="text-gray-400 font-medium">找不到相關餐點</p>
                            <p className="text-sm text-gray-300 mt-1">試試其他關鍵字？</p>
                        </div>
                    ) : (
                        filteredMenu.map(item => (
                            <MenuCard
                                key={item.id}
                                item={item}
                                isTrending={trendingItems.includes(item.name)}
                                quantity={cart.items.find(i => i.menuItemId === item.id)?.quantity || 0}
                                onAdd={() => cart.addItem({
                                    menuItemId: item.id,
                                    name: item.name,
                                    price: item.price,
                                    maxStock: item.stock,
                                })}
                                onRemove={() => cart.removeItem(item.id)}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* 底部購物車 */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.1)] border-t border-gray-100 z-40 safe-area-bottom">
                <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4 flex justify-between items-center">
                    <div>
                        <p className="text-xs text-gray-400 mb-0.5">預計金額</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-orange-500 text-sm font-bold">$</span>
                            <span className="text-3xl sm:text-4xl font-black text-gray-800 tabular-nums">
                                {cart.getTotal()}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={handleSubmitOrder}
                        disabled={isSubmitting || cart.items.length === 0}
                        className={`flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 rounded-2xl font-bold text-base sm:text-lg shadow-lg transition-all active:scale-95 ${cart.items.length === 0
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-gray-800 to-gray-900 text-white shadow-gray-400/30 hover:shadow-xl'
                            }`}
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                下單
                                <ShoppingCart className="w-5 h-5" />
                                {cart.getItemCount() > 0 && (
                                    <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                                        {cart.getItemCount()}
                                    </span>
                                )}
                            </>
                        )}
                    </button>
                </div>
            </div>

            {showCart && <CartDrawer onClose={() => setShowCart(false)} />}
            {showHistory && <OrderHistoryModal onClose={() => setShowHistory(false)} />}
            {showShare && <ShareModal shareUrl={shareUrl} title="🍽️ 校園點餐系統" onClose={() => setShowShare(false)} />}

            {/* 快速連結按鈕群 */}
            <div className="fixed bottom-28 sm:bottom-24 left-3 sm:left-4 flex flex-col gap-2 z-50">
                {/* 叫號顯示 */}
                <Link
                    to={`/display/${classId}`}
                    className="bg-green-600 hover:bg-green-500 text-white p-3 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95"
                    title="查看叫號"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="20" height="14" x="2" y="3" rx="2" />
                        <line x1="8" x2="16" y1="21" y2="21" />
                        <line x1="12" x2="12" y1="17" y2="21" />
                    </svg>
                </Link>
                {/* 廚房管理 */}
                <Link
                    to="/kitchen"
                    className="bg-gray-800 hover:bg-orange-500 text-white p-3 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95"
                    title="進入廚房管理"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                        <circle cx="12" cy="12" r="3" />
                    </svg>
                </Link>
            </div>

            {/* 頁尾 - OAuth 品牌驗證必要資訊 */}
            <footer className="bg-gray-900 text-gray-400 py-8 mt-8">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <h2 className="text-xl font-bold text-white mb-2">🍽️ 校園點餐系統</h2>
                    <p className="text-sm mb-4 max-w-md mx-auto">
                        校園點餐系統是專為校慶園遊會設計的線上點餐平台，提供即時叫號、快速取餐等服務，讓您輕鬆享用美食。
                    </p>
                    <div className="flex justify-center gap-4 text-xs">
                        <a
                            href={`${import.meta.env.BASE_URL}privacy.html`}
                            className="text-orange-400 hover:text-orange-300 underline"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            🔒 隱私權政策
                        </a>
                        <span className="text-gray-600">|</span>
                        <a
                            href={`${import.meta.env.BASE_URL}terms.html`}
                            className="text-orange-400 hover:text-orange-300 underline"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            📋 服務條款
                        </a>
                    </div>
                    <p className="text-xs text-gray-600 mt-4">
                        © 2026 校園點餐系統. All rights reserved.
                    </p>
                    <SiteCredit />
                </div>
            </footer>
        </div>
    );
}

export default CustomerApp;
