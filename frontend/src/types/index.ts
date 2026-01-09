// 分類品項
export interface CategoryItem {
    id: string;
    name: string;
    icon: string;
    order: number;
}

// 菜單品項
export interface MenuItem {
    id: string;
    name: string;
    price: number;
    stock: number;
    category: string; // 動態分類 ID (如 'main', 'drink', 'dessert' 或自訂)
    imageUrl?: string;
    isActive: boolean;
}

// 訂單品項
export interface OrderItem {
    menuItemId: string;
    name: string;
    quantity: number;
    price: number;
}

// 訂單
export interface Order {
    id: string;
    orderId?: string; // 相容舊格式
    classId?: string; // 班級廚房 ID（用於訂單狀態查詢）
    customerInfo: {
        class: string;
        name: string;
    };
    info?: string; // 相容舊格式
    items: OrderItem[];
    totalPrice: number;
    total?: number; // 相容舊格式
    note?: string;
    status: OrderStatus;
    time?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export type OrderStatus = 'Pending' | 'Preparing' | 'Completed' | 'Paid' | 'Cancelled';

// 購物車品項
export interface CartItem {
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    maxStock: number;
}

// 系統設定
export interface SystemConfig {
    isOpen: boolean;
    waitTime: number;
}

// API 回應
export interface ApiResponse<T = any> {
    status: 'success' | 'error';
    data?: T;
    message?: string;
    system?: SystemConfig;
    orderId?: string;
}
