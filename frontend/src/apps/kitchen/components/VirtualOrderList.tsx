/**
 * 虛擬列表訂單組件
 * 使用 @tanstack/react-virtual 優化大量訂單的渲染效能
 * 當訂單數量超過 VIRTUAL_THRESHOLD 時自動啟用虛擬化
 */

import { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChefHat, RefreshCw, Layers } from 'lucide-react';
import { OrderCard } from './OrderCard';
import type { OrderListProps } from '../types';

// 超過此數量時啟用虛擬化
const VIRTUAL_THRESHOLD = 20;

// 估計每張卡片的高度（px）
const ESTIMATED_CARD_HEIGHT = 220;

// 每行顯示的卡片數量（根據螢幕寬度）
function getColumnsCount(): number {
    if (typeof window === 'undefined') return 1;
    const width = window.innerWidth;
    if (width >= 1280) return 4; // xl
    if (width >= 1024) return 3; // lg
    if (width >= 768) return 2;  // md
    return 1;
}

export function VirtualOrderList({ orders, onRefetch, onStatusUpdate, onCancel }: OrderListProps) {
    const parentRef = useRef<HTMLDivElement>(null);
    const columns = useMemo(() => getColumnsCount(), []);

    // 將訂單分成行
    const rows = useMemo(() => {
        const result: typeof orders[] = [];
        for (let i = 0; i < orders.length; i += columns) {
            result.push(orders.slice(i, i + columns));
        }
        return result;
    }, [orders, columns]);

    // 虛擬化設定
    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => ESTIMATED_CARD_HEIGHT,
        overscan: 3, // 預渲染額外的 3 行
    });

    const shouldVirtualize = orders.length > VIRTUAL_THRESHOLD;

    // 如果訂單數量少，使用原本的渲染方式
    if (!shouldVirtualize) {
        return (
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-gray-300 flex items-center gap-2">
                        排隊中
                        <span className="bg-red-600 text-white px-2 py-0.5 rounded-full text-sm">
                            {orders.length}
                        </span>
                    </h2>
                    <button
                        onClick={onRefetch}
                        className="text-gray-400 hover:text-white text-sm bg-gray-800 px-4 py-2 rounded-lg border border-gray-700 flex items-center gap-1"
                    >
                        <RefreshCw className="w-4 h-4" />
                        重整
                    </button>
                </div>

                {orders.length === 0 ? (
                    <div className="text-center py-20 text-gray-600">
                        <ChefHat className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p>無訂單</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {orders.map((order) => (
                            <OrderCard
                                key={order.id}
                                order={order}
                                onStatusUpdate={onStatusUpdate}
                                onCancel={onCancel}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // 虛擬化渲染
    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-300 flex items-center gap-2">
                    排隊中
                    <span className="bg-red-600 text-white px-2 py-0.5 rounded-full text-sm">
                        {orders.length}
                    </span>
                    <span className="text-xs text-purple-400 flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        虛擬列表
                    </span>
                </h2>
                <button
                    onClick={onRefetch}
                    className="text-gray-400 hover:text-white text-sm bg-gray-800 px-4 py-2 rounded-lg border border-gray-700 flex items-center gap-1"
                >
                    <RefreshCw className="w-4 h-4" />
                    重整
                </button>
            </div>

            {orders.length === 0 ? (
                <div className="text-center py-20 text-gray-600">
                    <ChefHat className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>無訂單</p>
                </div>
            ) : (
                <div
                    ref={parentRef}
                    className="h-[calc(100vh-200px)] overflow-auto"
                    style={{ contain: 'strict' }}
                >
                    <div
                        style={{
                            height: `${virtualizer.getTotalSize()}px`,
                            width: '100%',
                            position: 'relative',
                        }}
                    >
                        {virtualizer.getVirtualItems().map((virtualRow) => {
                            const rowOrders = rows[virtualRow.index];
                            return (
                                <div
                                    key={virtualRow.key}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: `${virtualRow.size}px`,
                                        transform: `translateY(${virtualRow.start}px)`,
                                    }}
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
                                        {rowOrders.map((order) => (
                                            <OrderCard
                                                key={order.id}
                                                order={order}
                                                onStatusUpdate={onStatusUpdate}
                                                onCancel={onCancel}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
