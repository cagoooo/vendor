/**
 * Cart Store Unit Tests
 * Tests for shopping cart functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from '../../src/stores/cartStore';

describe('cartStore', () => {
    beforeEach(() => {
        // Reset store before each test
        useCartStore.getState().clearCart();
    });

    describe('addItem', () => {
        it('should add a new item to cart', () => {
            const store = useCartStore.getState();

            store.addItem({
                menuItemId: 'item-1',
                name: '雞腿飯',
                price: 80,
                maxStock: 10,
            });

            const { items } = useCartStore.getState();
            expect(items).toHaveLength(1);
            expect(items[0].name).toBe('雞腿飯');
            expect(items[0].quantity).toBe(1);
        });

        it('should increase quantity when adding same item', () => {
            const store = useCartStore.getState();

            store.addItem({ menuItemId: 'item-1', name: '雞腿飯', price: 80, maxStock: 10 });
            store.addItem({ menuItemId: 'item-1', name: '雞腿飯', price: 80, maxStock: 10 });

            const { items } = useCartStore.getState();
            expect(items).toHaveLength(1);
            expect(items[0].quantity).toBe(2);
        });

        it('should not exceed maxStock', () => {
            const store = useCartStore.getState();

            for (let i = 0; i < 5; i++) {
                store.addItem({ menuItemId: 'item-1', name: '雞腿飯', price: 80, maxStock: 3 });
            }

            const { items } = useCartStore.getState();
            expect(items[0].quantity).toBe(3); // Should be capped at maxStock
        });
    });

    describe('removeItem', () => {
        it('should decrease quantity when removing item', () => {
            const store = useCartStore.getState();

            store.addItem({ menuItemId: 'item-1', name: '雞腿飯', price: 80, maxStock: 10 });
            store.addItem({ menuItemId: 'item-1', name: '雞腿飯', price: 80, maxStock: 10 });
            store.removeItem('item-1');

            const { items } = useCartStore.getState();
            expect(items).toHaveLength(1);
            expect(items[0].quantity).toBe(1);
        });

        it('should remove item completely when quantity reaches 0', () => {
            const store = useCartStore.getState();

            store.addItem({ menuItemId: 'item-1', name: '雞腿飯', price: 80, maxStock: 10 });
            store.removeItem('item-1');

            const { items } = useCartStore.getState();
            expect(items).toHaveLength(0);
        });
    });

    describe('getTotal', () => {
        it('should calculate total correctly', () => {
            const store = useCartStore.getState();

            store.addItem({ menuItemId: 'item-1', name: '雞腿飯', price: 80, maxStock: 10 });
            store.addItem({ menuItemId: 'item-1', name: '雞腿飯', price: 80, maxStock: 10 });
            store.addItem({ menuItemId: 'item-2', name: '排骨飯', price: 75, maxStock: 10 });

            const total = useCartStore.getState().getTotal();
            expect(total).toBe(235); // 80*2 + 75*1
        });

        it('should return 0 for empty cart', () => {
            const total = useCartStore.getState().getTotal();
            expect(total).toBe(0);
        });
    });

    describe('clearCart', () => {
        it('should remove all items', () => {
            const store = useCartStore.getState();

            store.addItem({ menuItemId: 'item-1', name: '雞腿飯', price: 80, maxStock: 10 });
            store.addItem({ menuItemId: 'item-2', name: '排骨飯', price: 75, maxStock: 10 });
            store.clearCart();

            const { items } = useCartStore.getState();
            expect(items).toHaveLength(0);
        });
    });

    describe('getItemCount', () => {
        it('should count total items correctly', () => {
            const store = useCartStore.getState();

            store.addItem({ menuItemId: 'item-1', name: '雞腿飯', price: 80, maxStock: 10 });
            store.addItem({ menuItemId: 'item-1', name: '雞腿飯', price: 80, maxStock: 10 });
            store.addItem({ menuItemId: 'item-2', name: '排骨飯', price: 75, maxStock: 10 });

            const count = useCartStore.getState().getItemCount();
            expect(count).toBe(3); // 2 + 1
        });
    });
});
