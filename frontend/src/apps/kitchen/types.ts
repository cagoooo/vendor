import type { Order } from '../../types';

export interface MenuItem {
    id: string;
    name: string;
    price: number;
    stock: number;
    category: string;
    imageUrl?: string;
    isActive: boolean;
}

export interface SalesStats {
    revenue: number;
    orderCount: number;
    ranking: Array<{ name: string; qty: number }>;
}

export interface OrderCardProps {
    order: Order;
    onStatusUpdate: (orderId: string, status: string, total?: number) => void;
    onCancel: (orderId: string) => void;
}

export interface OrderListProps {
    orders: Order[];
    onRefetch: () => void;
    onStatusUpdate: (orderId: string, status: string, total?: number) => void;
    onCancel: (orderId: string) => void;
}

export type Tab = 'orders' | 'inventory' | 'stats' | 'dashboard';
