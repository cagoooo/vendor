/**
 * 離線同步 Hook
 * 在網路不穩定時暫存操作，恢復連線後自動同步
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface PendingAction {
    id: string;
    type: string;
    payload: unknown;
    timestamp: number;
}

const STORAGE_KEY = 'offline-pending-actions';

/**
 * 從 localStorage 讀取待處理操作
 */
function loadPendingActions(): PendingAction[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

/**
 * 儲存待處理操作到 localStorage
 */
function savePendingActions(actions: PendingAction[]): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(actions));
    } catch (error) {
        console.error('Failed to save pending actions:', error);
    }
}

export function useOfflineSync() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const syncInProgress = useRef(false);

    // 初始化載入待處理操作
    useEffect(() => {
        setPendingActions(loadPendingActions());
    }, []);

    // 監聽網路狀態
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
        };

        const handleOffline = () => {
            setIsOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // 上線時自動同步
    useEffect(() => {
        if (isOnline && pendingActions.length > 0 && !syncInProgress.current) {
            syncPendingActions();
        }
    }, [isOnline, pendingActions.length]);

    /**
     * 加入待處理佇列
     */
    const queueAction = useCallback((type: string, payload: unknown): string => {
        const action: PendingAction = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type,
            payload,
            timestamp: Date.now(),
        };

        setPendingActions(prev => {
            const updated = [...prev, action];
            savePendingActions(updated);
            return updated;
        });

        return action.id;
    }, []);

    /**
     * 移除已完成的操作
     */
    const removeAction = useCallback((actionId: string) => {
        setPendingActions(prev => {
            const updated = prev.filter(a => a.id !== actionId);
            savePendingActions(updated);
            return updated;
        });
    }, []);

    /**
     * 同步所有待處理操作
     */
    const syncPendingActions = useCallback(async () => {
        if (syncInProgress.current || pendingActions.length === 0) return;

        syncInProgress.current = true;
        setIsSyncing(true);

        const actionsToSync = [...pendingActions];
        const failedActions: PendingAction[] = [];

        for (const action of actionsToSync) {
            try {
                // 呼叫對應的處理函數
                await executeAction(action);
                removeAction(action.id);
            } catch (error) {
                console.error(`Failed to sync action ${action.id}:`, error);
                failedActions.push(action);
            }
        }

        // 更新失敗的操作
        if (failedActions.length < actionsToSync.length) {
            // 至少有部分成功，保留失敗的
            setPendingActions(failedActions);
            savePendingActions(failedActions);
        }

        syncInProgress.current = false;
        setIsSyncing(false);
    }, [pendingActions, removeAction]);

    /**
     * 清除所有待處理操作
     */
    const clearAllPending = useCallback(() => {
        setPendingActions([]);
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    return {
        isOnline,
        pendingCount: pendingActions.length,
        isSyncing,
        queueAction,
        syncPendingActions,
        clearAllPending,
    };
}

/**
 * 執行待處理操作
 * 根據 action.type 呼叫對應的 API
 */
async function executeAction(action: PendingAction): Promise<void> {
    // 這裡可以根據 action.type 分派到不同的處理器
    // 目前作為示例，只是簡單地 console log
    console.log('Executing offline action:', action.type, action.payload);

    // 模擬網路請求
    await new Promise(resolve => setTimeout(resolve, 100));

    // 實際使用時，可以像這樣分派：
    // switch (action.type) {
    //     case 'PLACE_ORDER':
    //         await placeClassOrder(...action.payload);
    //         break;
    //     case 'UPDATE_STOCK':
    //         await updateClassStock(...action.payload);
    //         break;
    // }
}

/**
 * 全局網路狀態監測（不需要 Hook 的場景使用）
 */
export function getNetworkStatus(): boolean {
    return navigator.onLine;
}
