import { useState, useEffect } from 'react';
import { X, Clock, ChefHat, CheckCircle, CreditCard, XCircle, RefreshCw } from 'lucide-react';
import { useOrderHistoryStore } from '../../stores';
import { checkOrderStatus } from '../../services/api';

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
        label: '✨ 請取餐',
        color: 'bg-green-100 text-green-700 border-green-200 animate-pulse',
        bg: 'bg-green-50'
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
    const { orders, updateOrderStatus, getActiveOrders, clearCompletedOrders } = useOrderHistoryStore();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const activeOrders = getActiveOrders();
    const completedOrders = orders.filter(o => o.status === 'Paid' || o.status === 'Cancelled');

    useEffect(() => {
        const refreshStatuses = async () => {
            const orderIds = activeOrders.map(order => order.id);
            if (orderIds.length === 0) return;

            const result = await checkOrderStatus(orderIds);
            if (result.status === 'success' && result.data) {
                Object.entries(result.data).forEach(([orderId, status]) => {
                    updateOrderStatus(orderId, status);
                });
            }
        };

        refreshStatuses();
        const interval = setInterval(refreshStatuses, 10000);
        return () => clearInterval(interval);
    }, [activeOrders.length]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        const orderIds = orders.map(order => order.id);
        if (orderIds.length > 0) {
            const result = await checkOrderStatus(orderIds);
            if (result.status === 'success' && result.data) {
                Object.entries(result.data).forEach(([orderId, status]) => {
                    updateOrderStatus(orderId, status);
                });
            }
        }
        setTimeout(() => setIsRefreshing(false), 500);
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center animate-fadeIn"
            onClick={onClose}
        >
            <div
                className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl max-h-[85vh] sm:max-h-[80vh] overflow-hidden shadow-2xl animate-slideUp"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex justify-between items-center z-10">
                    <div>
                        <h2 className="text-xl font-black text-gray-800">我的訂單</h2>
                        <p className="text-xs text-gray-400 mt-0.5">每10秒自動更新狀態</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleRefresh}
                            className={`p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition ${isRefreshing ? 'animate-spin' : ''}`}
                        >
                            <RefreshCw className="w-5 h-5" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition"
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

                                            return (
                                                <div
                                                    key={order.id}
                                                    className={`rounded-2xl border-2 overflow-hidden transition-all ${config.bg} ${order.status === 'Completed' ? 'border-green-300 shadow-lg shadow-green-100' : 'border-gray-100'
                                                        }`}
                                                >
                                                    <div className="p-4">
                                                        {/* 訂單頭部 */}
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

                                                        {/* 訂單內容 */}
                                                        <div className="text-sm text-gray-600 space-y-1.5 mb-3">
                                                            {order.items.map((item, idx) => (
                                                                <div key={idx} className="flex justify-between">
                                                                    <span>{item.name} <span className="text-orange-500 font-bold">×{item.quantity}</span></span>
                                                                    <span className="text-gray-400">${item.quantity * item.price}</span>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* 總價 */}
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
                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                                            歷史紀錄
                                        </h3>
                                        <button
                                            onClick={clearCompletedOrders}
                                            className="text-xs text-gray-400 hover:text-red-500 transition"
                                        >
                                            清除
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {completedOrders.slice(0, 5).map(order => {
                                            const config = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.Paid;
                                            const orderNum = order.id.split('-')[1] || order.id;

                                            return (
                                                <div
                                                    key={order.id}
                                                    className="bg-gray-50 rounded-xl p-3 flex justify-between items-center opacity-60"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-mono font-bold text-gray-500">{orderNum}</span>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full ${config.color}`}>
                                                            {config.label}
                                                        </span>
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
        </div>
    );
}

export default OrderHistoryModal;
