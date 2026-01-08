import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem } from '../types';

interface CartState {
    items: CartItem[];
    customerClass: string;
    customerName: string;
    note: string;

    // Actions
    addItem: (item: Omit<CartItem, 'quantity'>) => void;
    removeItem: (menuItemId: string) => void;
    updateQuantity: (menuItemId: string, quantity: number) => void;
    setCustomerInfo: (customerClass: string, customerName: string) => void;
    setNote: (note: string) => void;
    clearCart: () => void;
    getTotal: () => number;
    getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            customerClass: '',
            customerName: '',
            note: '',

            addItem: (item) => {
                const { items } = get();
                const existing = items.find(i => i.menuItemId === item.menuItemId);

                if (existing) {
                    if (existing.quantity < item.maxStock) {
                        set({
                            items: items.map(i =>
                                i.menuItemId === item.menuItemId
                                    ? { ...i, quantity: i.quantity + 1 }
                                    : i
                            )
                        });
                    }
                } else {
                    set({ items: [...items, { ...item, quantity: 1 }] });
                }
            },

            removeItem: (menuItemId) => {
                const { items } = get();
                const existing = items.find(i => i.menuItemId === menuItemId);

                if (existing && existing.quantity > 1) {
                    set({
                        items: items.map(i =>
                            i.menuItemId === menuItemId
                                ? { ...i, quantity: i.quantity - 1 }
                                : i
                        )
                    });
                } else {
                    set({ items: items.filter(i => i.menuItemId !== menuItemId) });
                }
            },

            updateQuantity: (menuItemId, quantity) => {
                const { items } = get();
                if (quantity <= 0) {
                    set({ items: items.filter(i => i.menuItemId !== menuItemId) });
                } else {
                    set({
                        items: items.map(i =>
                            i.menuItemId === menuItemId
                                ? { ...i, quantity: Math.min(quantity, i.maxStock) }
                                : i
                        )
                    });
                }
            },

            setCustomerInfo: (customerClass, customerName) => {
                set({ customerClass, customerName });
            },

            setNote: (note) => {
                set({ note });
            },

            clearCart: () => {
                set({ items: [], note: '' });
            },

            getTotal: () => {
                return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
            },

            getItemCount: () => {
                return get().items.reduce((sum, item) => sum + item.quantity, 0);
            }
        }),
        {
            name: 'cart-storage',
            partialize: (state) => ({
                customerClass: state.customerClass,
                customerName: state.customerName
            })
        }
    )
);
