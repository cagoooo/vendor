import { AlertTriangle } from 'lucide-react';
import type { MenuItem } from '../types';

export interface LowStockAlertProps {
    items: MenuItem[];
    threshold?: number; // 預設 5
    onItemClick?: (itemId: string) => void;
}

/**
 * 庫存低量警示組件
 * 當品項庫存低於門檻時顯示警示
 */
export function LowStockAlert({ items, threshold = 5, onItemClick }: LowStockAlertProps) {
    const lowStockItems = items.filter(item =>
        item.isActive && item.stock <= threshold && item.stock > 0
    );

    const outOfStockItems = items.filter(item =>
        item.isActive && item.stock === 0
    );

    if (lowStockItems.length === 0 && outOfStockItems.length === 0) {
        return null;
    }

    return (
        <div className="space-y-2 mb-4">
            {/* 售完警示 */}
            {outOfStockItems.length > 0 && (
                <div className="bg-red-900/40 border border-red-600/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-red-400 font-bold mb-2">
                        <AlertTriangle className="w-5 h-5" />
                        <span>已售完 ({outOfStockItems.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {outOfStockItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => onItemClick?.(item.id)}
                                className="bg-red-800/60 px-3 py-1.5 rounded-lg text-sm text-red-200 hover:bg-red-700/60 transition flex items-center gap-1.5"
                            >
                                <span className="font-medium">{item.name}</span>
                                <span className="text-red-400 text-xs">0</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* 低庫存警示 */}
            {lowStockItems.length > 0 && (
                <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-yellow-400 font-bold mb-2">
                        <AlertTriangle className="w-5 h-5" />
                        <span>庫存不足 ({lowStockItems.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {lowStockItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => onItemClick?.(item.id)}
                                className="bg-yellow-800/40 px-3 py-1.5 rounded-lg text-sm text-yellow-200 hover:bg-yellow-700/40 transition flex items-center gap-1.5"
                            >
                                <span className="font-medium">{item.name}</span>
                                <span className="text-yellow-400 text-xs">剩 {item.stock}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
