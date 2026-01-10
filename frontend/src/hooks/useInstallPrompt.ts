import { useState, useEffect } from 'react';

// 擴展全域類型以支援 PWA 相關屬性
declare global {
    interface Window {
        MSStream?: unknown;
    }
    interface Navigator {
        standalone?: boolean;
    }
}

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface UseInstallPromptReturn {
    isInstallable: boolean;
    isInstalled: boolean;
    isIOS: boolean;
    promptInstall: () => Promise<boolean>;
    dismiss: () => void;
    isDismissed: boolean;
}

const DISMISS_KEY = 'pwa-install-dismissed';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 天

/**
 * PWA 安裝提示 Hook
 * 處理 beforeinstallprompt 事件和 iOS 安裝引導
 */
export function useInstallPrompt(): UseInstallPromptReturn {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    // 檢查是否為 iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    // 檢查是否已安裝
    useEffect(() => {
        // 檢查 display-mode
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        const isInWebAppiOS = navigator.standalone === true;
        setIsInstalled(isStandalone || isInWebAppiOS);

        // 檢查是否已經關閉過提示
        const dismissedAt = localStorage.getItem(DISMISS_KEY);
        if (dismissedAt) {
            const dismissTime = parseInt(dismissedAt, 10);
            if (Date.now() - dismissTime < DISMISS_DURATION) {
                setIsDismissed(true);
            } else {
                localStorage.removeItem(DISMISS_KEY);
            }
        }
    }, []);

    // 監聽 beforeinstallprompt 事件
    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // 監聽安裝完成
        window.addEventListener('appinstalled', () => {
            setIsInstalled(true);
            setDeferredPrompt(null);
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    // 觸發安裝提示
    const promptInstall = async (): Promise<boolean> => {
        if (!deferredPrompt) {
            return false;
        }

        try {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;

            if (outcome === 'accepted') {
                setDeferredPrompt(null);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Install prompt error:', error);
            return false;
        }
    };

    // 關閉提示（記住 7 天）
    const dismiss = () => {
        setIsDismissed(true);
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
    };

    return {
        isInstallable: !!deferredPrompt || (isIOS && !isInstalled),
        isInstalled,
        isIOS,
        promptInstall,
        dismiss,
        isDismissed,
    };
}
