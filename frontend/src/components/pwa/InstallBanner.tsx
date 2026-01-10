import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import { Download, X, Share, PlusSquare } from 'lucide-react';

/**
 * PWA 安裝提示橫幅
 * 在支援的裝置上顯示安裝到主畫面的提示
 */
export function InstallBanner() {
    const { isInstallable, isInstalled, isIOS, promptInstall, dismiss, isDismissed } = useInstallPrompt();

    // 不顯示的情況
    if (isInstalled || isDismissed || !isInstallable) {
        return null;
    }

    const handleInstall = async () => {
        if (isIOS) {
            // iOS 無法程式觸發安裝，顯示說明即可
            return;
        }
        await promptInstall();
    };

    return (
        <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 animate-slide-up">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl shadow-2xl p-4 text-white">
                <button
                    onClick={dismiss}
                    className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-full transition"
                    aria-label="關閉"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="flex items-start gap-3">
                    <div className="bg-white/20 rounded-xl p-2">
                        <Download className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-lg">安裝到主畫面</h3>
                        <p className="text-white/80 text-sm mt-1">
                            {isIOS
                                ? '點擊下方分享按鈕，選擇「加入主畫面」'
                                : '快速存取點餐系統，離線也能使用！'}
                        </p>
                    </div>
                </div>

                {isIOS ? (
                    <div className="mt-3 flex items-center justify-center gap-2 bg-white/10 rounded-lg py-2 px-3">
                        <span className="text-sm">點擊</span>
                        <Share className="w-5 h-5" />
                        <span className="text-sm">→</span>
                        <PlusSquare className="w-5 h-5" />
                        <span className="text-sm">加入主畫面</span>
                    </div>
                ) : (
                    <button
                        onClick={handleInstall}
                        className="mt-3 w-full bg-white text-orange-500 font-bold py-2 rounded-xl hover:bg-orange-50 transition flex items-center justify-center gap-2"
                    >
                        <Download className="w-5 h-5" />
                        立即安裝
                    </button>
                )}
            </div>
        </div>
    );
}
