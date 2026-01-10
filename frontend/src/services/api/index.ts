/**
 * 統一 API 入口
 * 提供一致的 API 調用介面，取代直接引用多個獨立 API 檔案
 * 
 * 使用方式：
 *   import { api } from '../services/api';
 *   const menu = await api.class.getMenu('class-6-7');
 */

import * as classApi from '../classApi';

// 班級 API（主要使用）
export const api = {
    class: {
        // 菜單
        getMenu: classApi.getClassMenu,
        getTrending: classApi.getClassTrending,
        addMenuItem: classApi.addClassMenuItem,
        updateMenuItem: classApi.updateClassMenuItem,
        updateStock: classApi.updateClassStock,
        uploadImage: classApi.uploadMenuItemImage,
        deleteImage: classApi.deleteMenuItemImage,

        // 訂單
        placeOrder: classApi.placeClassOrder,
        getOrders: classApi.getClassOrders,
        subscribeOrders: classApi.subscribeToClassOrders,
        updateOrderStatus: classApi.updateClassOrderStatus,
        cancelOrder: classApi.cancelClassOrder,
        checkOrderStatus: classApi.checkClassOrderStatus,
        clearOrders: classApi.clearClassOrders,

        // 統計
        getStats: classApi.getClassStats,

        // 系統設定
        setConfig: classApi.setClassSystemConfig,

        // 分類
        getCategories: classApi.getClassCategories,
        updateCategories: classApi.updateClassCategories,
    },

    // 班級管理
    kitchen: {
        getAll: classApi.getAllKitchens,
        create: classApi.createKitchen,
    },
};

// Re-export types from appropriate sources
export type { Kitchen } from '../classApi';
export type { Order, ApiResponse, CategoryItem } from '../../types';
