/**
 * 離線狀態指示器
 * 顯示在畫面角落，提醒用戶目前處於離線狀態
 */

import { WifiOff, RefreshCw, Check } from 'lucide-react';
import { useOfflineSync } from '../hooks/useOfflineSync';

export function OfflineIndicator() {
    const { isOnline, pendingCount, isSyncing } = useOfflineSync();

    // 線上且無待處理操作時不顯示
    if (isOnline && pendingCount === 0 && !isSyncing) {
        return null;
    }

    // 正在同步
    if (isSyncing) {
        return (
            <div className="fixed bottom-4 left-4 bg-blue-600 text-white px-4 py-3 rounded-xl flex items-center gap-3 shadow-lg z-50 animate-pulse">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <div>
                    <div className="font-bold text-sm">同步中...</div>
                    <div className="text-xs text-blue-200">正在上傳 {pendingCount} 筆資料</div>
                </div>
            </div>
        );
    }

    // 離線狀態
    if (!isOnline) {
        return (
            <div className="fixed bottom-4 left-4 bg-red-600 text-white px-4 py-3 rounded-xl flex items-center gap-3 shadow-lg z-50">
                <WifiOff className="w-5 h-5" />
                <div>
                    <div className="font-bold text-sm">離線模式</div>
                    {pendingCount > 0 && (
                        <div className="text-xs text-red-200">{pendingCount} 筆待同步</div>
                    )}
                </div>
            </div>
        );
    }

    // 線上但有待處理操作（可能是之前失敗的）
    if (pendingCount > 0) {
        return (
            <div className="fixed bottom-4 left-4 bg-yellow-600 text-white px-4 py-3 rounded-xl flex items-center gap-3 shadow-lg z-50">
                <RefreshCw className="w-5 h-5" />
                <div>
                    <div className="font-bold text-sm">待同步</div>
                    <div className="text-xs text-yellow-200">{pendingCount} 筆操作等待中</div>
                </div>
            </div>
        );
    }

    return null;
}

/**
 * 同步成功提示（可選使用）
 */
export function SyncSuccessToast({ onClose }: { onClose: () => void }) {
    return (
        <div className="fixed bottom-4 left-4 bg-green-600 text-white px-4 py-3 rounded-xl flex items-center gap-3 shadow-lg z-50 animate-fade-in">
            <Check className="w-5 h-5" />
            <div className="font-bold text-sm">同步完成</div>
            <button onClick={onClose} className="ml-2 text-green-200 hover:text-white">
                ✕
            </button>
        </div>
    );
}
