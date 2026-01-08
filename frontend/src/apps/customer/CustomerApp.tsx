import { useState, useMemo } from 'react';
import { useMenu } from '../../hooks/useMenu';
import { useCartStore, useOrderHistoryStore } from '../../stores';
import { placeOrder } from '../../services/api';
import { MenuCard } from '../../components/order/MenuCard';
import { CartDrawer } from '../../components/order/CartDrawer';
import { OrderHistoryModal } from '../../components/order/OrderHistoryModal';
import { ShoppingCart, Receipt, Clock, Loader2, Store, Search, Utensils } from 'lucide-react';
import Swal from 'sweetalert2';

type Category = 'all' | 'main' | 'drink' | 'dessert';

export function CustomerApp() {
    const { menuItems, trendingItems, systemConfig, isLoading, error } = useMenu();
    const cart = useCartStore();
    const orderHistory = useOrderHistoryStore();

    const [category, setCategory] = useState<Category>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showCart, setShowCart] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

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
        if (!cart.customerClass.trim()) {
            Swal.fire({ toast: true, position: 'top', icon: 'warning', title: '請填寫班級！', showConfirmButton: false, timer: 2000 });
            return;
        }
        if (!cart.customerName.trim()) {
            Swal.fire({ toast: true, position: 'top', icon: 'warning', title: '請填寫姓名！', showConfirmButton: false, timer: 2000 });
            return;
        }
        if (cart.items.length === 0) {
            Swal.fire({ icon: 'info', title: '購物車是空的', text: '請先點選餐點喔！', confirmButtonColor: '#f97316' });
            return;
        }

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
            const response = await placeOrder(
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
            {/* Hero Banner */}
            <div className="relative h-48 sm:h-56 md:h-64 lg:h-72 overflow-hidden">
                <img
                    src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1200&auto=format&fit=crop"
                    className="w-full h-full object-cover"
                    alt="Food Banner"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 lg:p-8">
                    <div className="max-w-4xl mx-auto">
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-1 flex items-center gap-2">
                            <span className="text-3xl sm:text-4xl">🎈</span>
                            校慶園遊會
                        </h1>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm">
                            <span className="text-orange-300 flex items-center gap-1">
                                <Utensils className="w-4 h-4" />
                                線上點餐
                            </span>
                            <span className="text-white/60">•</span>
                            <span className="text-white/80">即時叫號</span>
                            {systemConfig?.waitTime && (
                                <>
                                    <span className="text-white/60">•</span>
                                    <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-white text-xs font-medium">
                                        <Clock className="w-3 h-3 inline mr-1" />
                                        約 {systemConfig.waitTime} 分鐘
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 訂單追蹤按鈕 */}
            <button
                onClick={() => setShowHistory(true)}
                className="fixed top-3 right-3 sm:top-4 sm:right-4 z-40 bg-white/95 backdrop-blur-md text-gray-800 pl-3 pr-4 py-2.5 rounded-full shadow-lg border border-gray-200/50 font-bold text-sm flex items-center gap-2 transition-all hover:shadow-xl hover:scale-105 active:scale-95"
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

            {/* 主內容區 */}
            <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6">
                {/* 顧客資訊卡片 */}
                <div className="relative -mt-8 sm:-mt-10 mb-4">
                    <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-4 sm:p-5 border border-gray-100">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-xl">👋</span>
                            <h2 className="font-bold text-gray-700">誰要吃？</h2>
                        </div>
                        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3">
                            <input
                                type="text"
                                placeholder="班級"
                                value={cart.customerClass}
                                onChange={e => cart.setCustomerInfo(e.target.value, cart.customerName)}
                                className="col-span-1 w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-3 py-2.5 sm:py-3 text-center font-bold text-base sm:text-lg focus:outline-none focus:border-orange-400 focus:bg-white transition placeholder-gray-300"
                            />
                            <input
                                type="text"
                                placeholder="你的名字"
                                value={cart.customerName}
                                onChange={e => cart.setCustomerInfo(cart.customerClass, e.target.value)}
                                className="col-span-2 w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-3 py-2.5 sm:py-3 font-bold text-base sm:text-lg focus:outline-none focus:border-orange-400 focus:bg-white transition placeholder-gray-300"
                            />
                        </div>
                        <input
                            type="text"
                            placeholder="📝 備註 (例: 不要香菜、微冰...)"
                            value={cart.note}
                            onChange={e => cart.setNote(e.target.value)}
                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 focus:bg-white transition placeholder-gray-400"
                        />
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
                        {(['all', 'main', 'drink', 'dessert'] as Category[]).map(cat => {
                            const labels: Record<Category, string> = { all: '🍽️ 全部', main: '🍛 主食', drink: '🥤 飲料', dessert: '🍰 點心' };
                            const isActive = category === cat;
                            return (
                                <button
                                    key={cat}
                                    onClick={() => setCategory(cat)}
                                    className={`whitespace-nowrap px-4 sm:px-5 py-2 rounded-full text-sm font-bold shadow-sm transition-all active:scale-95 ${isActive
                                            ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-orange-200'
                                            : 'bg-white border-2 border-gray-100 text-gray-600 hover:border-orange-200'
                                        }`}
                                >
                                    {labels[cat]}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 菜單標題 */}
                <div className="flex justify-between items-end mt-4 mb-3">
                    <h2 className="text-lg sm:text-xl font-black text-gray-800">
                        {category === 'all' ? '所有餐點' : category === 'main' ? '飽足主食' : category === 'drink' ? '解渴飲料' : '美味點心'}
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
        </div>
    );
}

export default CustomerApp;
