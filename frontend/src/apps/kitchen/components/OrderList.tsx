import { ChefHat, RefreshCw } from 'lucide-react';
import { OrderCard } from './OrderCard';
import type { OrderListProps } from '../types';

export function OrderList({ orders, onRefetch, onStatusUpdate, onCancel }: OrderListProps) {
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
