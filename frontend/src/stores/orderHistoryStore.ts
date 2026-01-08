import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Order } from '../types';

interface OrderHistoryState {
    orders: Order[];

    // Actions
    addOrder: (order: Order) => void;
    updateOrderStatus: (orderId: string, status: string) => void;
    getActiveOrders: () => Order[];
    clearHistory: () => void;
    clearCompletedOrders: () => void;
}

export const useOrderHistoryStore = create<OrderHistoryState>()(
    persist(
        (set, get) => ({
            orders: [],

            addOrder: (order) => {
                set({ orders: [order, ...get().orders].slice(0, 50) });
            },

            updateOrderStatus: (orderId, status) => {
                set({
                    orders: get().orders.map(o =>
                        o.id === orderId ? { ...o, status: status as Order['status'] } : o
                    )
                });
            },

            getActiveOrders: () => {
                return get().orders.filter(o =>
                    o.status !== 'Paid' && o.status !== 'Cancelled'
                );
            },

            clearHistory: () => {
                set({ orders: [] });
            },

            clearCompletedOrders: () => {
                set({
                    orders: get().orders.filter(o =>
                        o.status !== 'Paid' && o.status !== 'Cancelled'
                    )
                });
            }
        }),
        {
            name: 'order-history-storage'
        }
    )
);
