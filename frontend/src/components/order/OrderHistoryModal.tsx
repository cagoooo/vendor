import { useState, useEffect, useRef } from 'react';
import { X, Clock, ChefHat, CheckCircle, CreditCard, XCircle, RefreshCw, Bell, PartyPopper } from 'lucide-react';
import { useOrderHistoryStore } from '../../stores';
import { checkClassOrderStatus } from '../../services/classApi';

interface OrderHistoryModalProps {
    onClose: () => void;
}

const statusConfig = {
    Pending: {
        icon: Clock,
        label: '等待接單',
        color: 'bg-amber-100 text-amber-700 border-amber-200',
        bg: 'bg-amber-50'
    },
    Preparing: {
        icon: ChefHat,
        label: '製作中',
        color: 'bg-blue-100 text-blue-700 border-blue-200',
        bg: 'bg-blue-50'
    },
    Completed: {
        icon: CheckCircle,
        label: '請取餐',
        color: 'bg-green-500 text-white border-green-500',
        bg: 'bg-gradient-to-br from-green-50 to-emerald-100'
    },
    Paid: {
        icon: CreditCard,
        label: '已完成',
        color: 'bg-gray-100 text-gray-500 border-gray-200',
        bg: 'bg-gray-50'
    },
    Cancelled: {
        icon: XCircle,
        label: '已取消',
        color: 'bg-red-100 text-red-500 border-red-200',
        bg: 'bg-red-50'
    },
};

export function OrderHistoryModal({ onClose }: OrderHistoryModalProps) {
    const { orders, updateOrderStatus, removeOrder, getActiveOrders, clearCompletedOrders } = useOrderHistoryStore();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const activeOrders = getActiveOrders();
    const completedOrders = orders.filter(o => o.status === 'Paid' || o.status === 'Cancelled');

    // 追蹤「請取餐」訂單
    const readyOrders = activeOrders.filter(o => o.status === 'Completed');
    const audioRef = useRef<HTMLAudioElement>(null);
    const prevReadyCountRef = useRef(0);

    // 刷新訂單狀態 - 按 classId 分組查詢
    const refreshStatuses = async (targetOrders: typeof orders) => {
        if (targetOrders.length === 0) return;

        const ordersByClass = new Map<string, string[]>();
        for (const order of targetOrders) {
            const classId = order.classId || 'default';
            if (!ordersByClass.has(classId)) {
                ordersByClass.set(classId, []);
            }
            ordersByClass.get(classId)!.push(order.id);
        }

        for (const [classId, orderIds] of ordersByClass.entries()) {
            const result = await checkClassOrderStatus(classId, orderIds);
            if (result.status === 'success' && result.data) {
                // 更新有返回狀態的訂單
                Object.entries(result.data).forEach(([orderId, status]) => {
                    updateOrderStatus(orderId, status);
                });

                // 移除後台已刪除的訂單
                for (const orderId of orderIds) {
                    if (!(orderId in result.data)) {
                        removeOrder(orderId);
                    }
                }
            }
        }
    };

    // 檢測新的請取餐訂單並播放音效
    useEffect(() => {
        if (readyOrders.length > prevReadyCountRef.current) {
            audioRef.current?.play().catch(() => { });
        }
        prevReadyCountRef.current = readyOrders.length;
    }, [readyOrders.length]);

    useEffect(() => {
        refreshStatuses(activeOrders);
        const interval = setInterval(() => refreshStatuses(activeOrders), 10000);
        return () => clearInterval(interval);
    }, [activeOrders.length]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refreshStatuses(orders);
        setTimeout(() => setIsRefreshing(false), 500);
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center animate-fadeIn"
            onClick={onClose}
        >
            {/* 音效 */}
            <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" preload="auto" />

            <div
                className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl max-h-[85vh] sm:max-h-[80vh] overflow-hidden shadow-2xl animate-slideUp"
                onClick={e => e.stopPropagation()}
            >
                {/* Header - 如果有請取餐訂單，顯示特殊樣式 */}
                <div className={`sticky top-0 border-b px-4 sm:px-6 py-4 flex justify-between items-center z-10 transition-colors ${readyOrders.length > 0
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 border-green-400'
                    : 'bg-white border-gray-100'
                    }`}>
                    <div>
                        <h2 className={`text-xl font-black ${readyOrders.length > 0 ? 'text-white' : 'text-gray-800'}`}>
                            {readyOrders.length > 0 ? (
                                <span className="flex items-center gap-2">
                                    <Bell className="w-5 h-5 animate-bounce" />
                                    請取餐！
                                </span>
                            ) : '我的訂單'}
                        </h2>
                        <p className={`text-xs mt-0.5 ${readyOrders.length > 0 ? 'text-green-100' : 'text-gray-400'}`}>
                            {readyOrders.length > 0 ? `${readyOrders.length} 筆訂單已完成` : '每10秒自動更新狀態'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleRefresh}
                            className={`p-2.5 rounded-xl transition ${readyOrders.length > 0
                                ? 'bg-white/20 hover:bg-white/30 text-white'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                                } ${isRefreshing ? 'animate-spin' : ''}`}
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                        <button
                            onClick={onClose}
                            className={`p-2.5 rounded-xl transition ${readyOrders.length > 0
                                ? 'bg-white/20 hover:bg-white/30 text-white'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                                }`}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-[calc(85vh-80px)] sm:max-h-[calc(80vh-80px)] overscroll-contain">
                    {orders.length === 0 ? (
                        <div className="text-center py-16 px-6">
                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                                <Clock className="w-10 h-10 text-gray-300" />
                            </div>
                            <p className="text-gray-400 font-medium">還沒有訂單</p>
                            <p className="text-sm text-gray-300 mt-1">下單後會在這裡顯示</p>
                        </div>
                    ) : (
                        <div className="p-4 sm:p-6 space-y-4">
                            {/* 進行中的訂單 */}
                            {activeOrders.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        進行中
                                    </h3>
                                    <div className="space-y-3">
                                        {activeOrders.map(order => {
                                            const config = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.Pending;
                                            const StatusIcon = config.icon;
                                            const orderNum = order.id.split('-')[1] || order.id;
                                            const isReady = order.status === 'Completed';

                                            // 請取餐狀態 - 超級醒目的卡片
                                            if (isReady) {
                                                return (
                                                    <div
                                                        key={order.id}
                                                        className="relative rounded-2xl overflow-hidden"
                                                        style={{
                                                            background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
                                                            boxShadow: '0 0 30px rgba(16, 185, 129, 0.4), 0 0 60px rgba(16, 185, 129, 0.2)',
                                                            animation: 'pulse-glow 2s ease-in-out infinite'
                                                        }}
                                                    >
                                                        {/* 頂部大橫幅 */}
                                                        <div className="bg-white/10 backdrop-blur-sm px-4 py-3 text-center border-b border-white/20">
                                                            <div className="flex items-center justify-center gap-2 text-white">
                                                                <PartyPopper className="w-6 h-6 animate-bounce" />
                                                                <span className="text-2xl font-black tracking-wide">🎉 請取餐！</span>
                                                                <PartyPopper className="w-6 h-6 animate-bounce" style={{ animationDelay: '0.1s' }} />
                                                            </div>
                                                        </div>

                                                        <div className="p-5">
                                                            {/* 超大號碼 */}
                                                            <div className="text-center mb-4">
                                                                <span className="text-xs text-white/70 block mb-1">您的取餐號碼</span>
                                                                <div className="inline-block bg-white rounded-2xl px-8 py-4 shadow-lg">
                                                                    <span
                                                                        className="text-5xl font-black text-green-600"
                                                                        style={{ fontFamily: "'Courier New', monospace" }}
                                                                    >
                                                                        {orderNum}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* 訂單內容 */}
                                                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 mb-3">
                                                                <div className="text-sm text-white/90 space-y-1">
                                                                    {order.items.map((item, idx) => (
                                                                        <div key={idx} className="flex justify-between">
                                                                            <span>{item.name} <span className="text-yellow-300 font-bold">×{item.quantity}</span></span>
                                                                            <span className="text-white/70">${item.quantity * item.price}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            {/* 總價和時間 */}
                                                            <div className="flex justify-between items-center text-white">
                                                                <span className="text-xs text-white/60">{order.time}</span>
                                                                <span className="text-2xl font-black">${order.totalPrice}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            // 一般狀態卡片
                                            return (
                                                <div
                                                    key={order.id}
                                                    className={`rounded-2xl border-2 overflow-hidden transition-all ${config.bg} border-gray-100`}
                                                >
                                                    <div className="p-4">
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div>
                                                                <span className="text-xs text-gray-400 block mb-1">取餐號碼</span>
                                                                <span className="text-3xl font-black text-gray-800" style={{ fontFamily: "'Courier New', monospace" }}>
                                                                    {orderNum}
                                                                </span>
                                                            </div>
                                                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-bold ${config.color}`}>
                                                                <StatusIcon className="w-4 h-4" />
                                                                {config.label}
                                                            </div>
                                                        </div>
                                                        <div className="text-sm text-gray-600 space-y-1.5 mb-3">
                                                            {order.items.map((item, idx) => (
                                                                <div key={idx} className="flex justify-between">
                                                                    <span>{item.name} <span className="text-orange-500 font-bold">×{item.quantity}</span></span>
                                                                    <span className="text-gray-400">${item.quantity * item.price}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="flex justify-between items-center pt-3 border-t border-gray-200/50">
                                                            <span className="text-xs text-gray-400">{order.time}</span>
                                                            <span className="text-xl font-black text-gray-800">${order.totalPrice}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* 已完成的訂單 */}
                            {completedOrders.length > 0 && (
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">歷史紀錄</h3>
                                        <button onClick={clearCompletedOrders} className="text-xs text-gray-400 hover:text-red-500 transition">清除</button>
                                    </div>
                                    <div className="space-y-2">
                                        {completedOrders.slice(0, 5).map(order => {
                                            const config = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.Paid;
                                            const orderNum = order.id.split('-')[1] || order.id;
                                            return (
                                                <div key={order.id} className="bg-gray-50 rounded-xl p-3 flex justify-between items-center opacity-60">
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-mono font-bold text-gray-500">{orderNum}</span>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full ${config.color}`}>{config.label}</span>
                                                    </div>
                                                    <span className="font-bold text-gray-500">${order.totalPrice}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes pulse-glow {
                    0%, 100% { transform: scale(1); box-shadow: 0 0 30px rgba(16, 185, 129, 0.4); }
                    50% { transform: scale(1.01); box-shadow: 0 0 40px rgba(16, 185, 129, 0.6); }
                }
            `}</style>
        </div>
    );
}

export default OrderHistoryModal;
