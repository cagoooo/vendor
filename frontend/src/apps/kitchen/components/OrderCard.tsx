import { memo } from 'react';
import { Trash2 } from 'lucide-react';
import type { OrderCardProps } from '../types';

export const OrderCard = memo(function OrderCard({ order, onStatusUpdate, onCancel }: OrderCardProps) {
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
        <div className={`rounded-xl p-4 shadow-lg border-l-[6px] ${cardStyle} transition-all`}>
            {/* Header */}
            <div className="flex justify-between items-start mb-2">
                <div className="pr-12">
                    <h3 className="text-lg lg:text-xl font-bold text-white truncate">{order.info}</h3>
                    <span className="text-xs lg:text-sm text-gray-400 font-mono">{order.time}</span>
                    {isPrep && (
                        <span className="ml-2 text-[10px] bg-orange-600 px-1 rounded animate-pulse">製作中</span>
                    )}
                    {isDone && (
                        <span className="ml-2 text-[10px] bg-green-600 px-1 rounded font-bold">待取餐</span>
                    )}
                </div>
                <div className="text-right">
                    <div className="text-[10px] lg:text-xs text-gray-400">NO.</div>
                    <div className="text-xl lg:text-2xl font-bold text-white" style={{ fontFamily: "'Courier New', monospace" }}>
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
            <div className="bg-gray-900/50 rounded-lg p-3 lg:p-4 mb-4 space-y-1 lg:space-y-2 max-h-32 lg:max-h-40 overflow-y-auto border border-gray-700/50">
                {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm lg:text-base border-b border-gray-700/50 pb-1 lg:pb-2">
                        <span className="text-gray-300">{item.name}</span>
                        <span className="font-bold text-orange-400">x{item.quantity}</span>
                    </div>
                ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-3 border-t border-gray-700">
                <span className="font-bold text-lg sm:text-xl lg:text-2xl text-gray-300 shrink-0">
                    ${order.total || order.totalPrice}
                </span>
                <button
                    onClick={() => onStatusUpdate(order.id, nextStatus, order.total || order.totalPrice)}
                    className={`flex-1 min-w-0 ${btnStyle} text-white px-2 sm:px-3 lg:px-4 py-2.5 sm:py-3 lg:py-4 rounded-lg font-bold shadow transition active:scale-95 text-xs sm:text-sm lg:text-base whitespace-nowrap`}
                >
                    {btnText}
                </button>
                <button
                    onClick={() => onCancel(order.id)}
                    className="shrink-0 bg-gray-700 hover:bg-red-600 text-gray-400 hover:text-white p-2.5 sm:p-3 rounded-lg transition"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
});
