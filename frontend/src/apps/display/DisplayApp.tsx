import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useClassOrders } from '../../hooks/useClassOrders';
import { Utensils, CheckCircle, Volume2, VolumeX, Maximize, Clock, Coffee } from 'lucide-react';
import { Confetti, CookingAnimation } from '../../components/animations';

// CSS animations for enhanced effects
const animationStyles = `
    @keyframes slideInBounce {
        0% { transform: translateX(100%) scale(0.8); opacity: 0; }
        60% { transform: translateX(-10%) scale(1.05); opacity: 1; }
        80% { transform: translateX(5%) scale(0.98); }
        100% { transform: translateX(0) scale(1); opacity: 1; }
    }
    @keyframes pulseGlow {
        0%, 100% { box-shadow: 0 0 20px rgba(34, 197, 94, 0.3); }
        50% { box-shadow: 0 0 40px rgba(34, 197, 94, 0.6), 0 0 60px rgba(34, 197, 94, 0.3); }
    }
    @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
    }
    @keyframes breathe {
        0%, 100% { transform: scale(1); opacity: 0.8; }
        50% { transform: scale(1.02); opacity: 1; }
    }
    @keyframes progressBar {
        0% { width: 0%; }
        100% { width: 100%; }
    }
    .animate-slide-in-bounce {
        animation: slideInBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
    .animate-pulse-glow {
        animation: pulseGlow 2s ease-in-out infinite;
    }
    .animate-shimmer {
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
        background-size: 200% 100%;
        animation: shimmer 2s infinite;
    }
    .animate-breathe {
        animation: breathe 2s ease-in-out infinite;
    }
    .progress-bar {
        animation: progressBar 15s linear infinite;
    }
`;

export function DisplayApp() {
    // 從 URL 讀取 classId（支援 /display/:classId 或 ?class=xxx）
    const { classId: paramClassId } = useParams<{ classId?: string }>();
    const [searchParams] = useSearchParams();
    const classId = paramClassId || searchParams.get('class') || 'default';

    const { orders } = useClassOrders(classId, true);

    // 計算 preparingOrders 和 completedOrders
    const preparingOrders = useMemo(() =>
        orders.filter(o => o.status === 'Preparing' || o.status === 'Pending'),
        [orders]
    );
    const completedOrders = useMemo(() =>
        orders.filter(o => o.status === 'Completed'),
        [orders]
    );

    const [audioEnabled, setAudioEnabled] = useState(false);
    const [lastReadyIds, setLastReadyIds] = useState<Set<string>>(new Set());
    const [isFirstLoad, setIsFirstLoad] = useState(true);
    const [flashActive, setFlashActive] = useState(false);
    const [confettiActive, setConfettiActive] = useState(false);
    const [newReadyIds, setNewReadyIds] = useState<Set<string>>(new Set());
    const audioRef = useRef<HTMLAudioElement>(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    // 更新時間
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // 新訂單完成時播放音效和彩花
    useEffect(() => {
        if (isFirstLoad) {
            setIsFirstLoad(false);
            setLastReadyIds(new Set(completedOrders.map(o => o.id)));
            return;
        }

        const currentIds = new Set(completedOrders.map(o => o.id));
        const newIds = completedOrders.filter(o => !lastReadyIds.has(o.id)).map(o => o.id);
        const hasNew = newIds.length > 0;

        if (hasNew) {
            // 追蹤新完成的訂單 ID，用於入場動畫
            setNewReadyIds(new Set(newIds));

            // 觸發彩花特效
            setConfettiActive(true);
            setTimeout(() => setConfettiActive(false), 3500);

            // 清除新訂單標記（動畫結束後）
            setTimeout(() => setNewReadyIds(new Set()), 5000);

            if (audioEnabled) {
                audioRef.current?.play().catch(() => { });
            }

            setFlashActive(true);
            setTimeout(() => setFlashActive(false), 3000);
        }

        setLastReadyIds(currentIds);
    }, [completedOrders, audioEnabled]);

    const toggleAudio = () => {
        if (!audioEnabled) {
            audioRef.current?.play().then(() => {
                audioRef.current?.pause();
                if (audioRef.current) audioRef.current.currentTime = 0;
                setAudioEnabled(true);
            }).catch(() => {
                alert('無法開啟音效，請確認瀏覽器設定');
            });
        } else {
            setAudioEnabled(false);
        }
    };

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    // 只顯示製作中和待處理的訂單
    const prepOrders = preparingOrders.sort((a, b) => a.id.localeCompare(b.id));
    // 只顯示已完成待取餐的訂單
    const readyOrders = completedOrders.sort((a, b) => a.id.localeCompare(b.id));

    return (
        <div className="h-screen flex flex-col p-2 md:p-6 lg:p-8 bg-slate-900 text-white overflow-hidden">
            {/* 動畫樣式 */}
            <style>{animationStyles}</style>

            {/* 彩花特效 */}
            <Confetti isActive={confettiActive} />

            <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" />

            {/* Header */}
            <header className="flex justify-between items-end border-b-2 md:border-b-4 border-gray-700 pb-2 md:pb-4 mb-2 md:mb-6 shrink-0">
                <div>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-wider text-white flex items-center gap-3">
                        <Utensils className="w-8 h-8 md:w-12 md:h-12 text-orange-500" />
                        <span className="drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">取餐叫號</span>
                    </h1>
                    <p className="text-gray-400 mt-1 md:mt-2 text-sm md:text-xl font-medium font-mono flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {currentTime.toLocaleTimeString('zh-TW', { hour12: false })}
                    </p>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1 md:gap-2">
                        <Link
                            to={`/order/${classId}`}
                            className="flex items-center gap-1 px-2 md:px-3 py-1 rounded-full text-xs md:text-sm bg-orange-600/50 text-orange-200 border border-orange-500 hover:bg-orange-500 transition"
                            title="返回點餐"
                        >
                            <Utensils className="w-3 h-3 md:w-4 md:h-4" />
                            <span className="hidden sm:inline">返回點餐</span>
                        </Link>
                        <button
                            onClick={toggleAudio}
                            title={audioEnabled ? '點擊靜音' : '點擊開啟音效'}
                            className={`flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 rounded-full text-xs md:text-sm transition cursor-pointer ${audioEnabled
                                ? 'bg-green-900/50 text-green-300 border border-green-700 hover:bg-green-800'
                                : 'bg-red-900/50 text-red-300 border border-red-700 hover:bg-red-900 animate-pulse'
                                }`}
                        >
                            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                            <span className="sm:hidden">{audioEnabled ? '開' : '關'}</span>
                            <span className="hidden sm:inline">{audioEnabled ? '音效已開啟' : '音效已關閉'}</span>
                        </button>
                    </div>
                    <p className="text-xs md:text-sm text-gray-500">Pickup Area</p>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col-reverse md:grid md:grid-cols-2 gap-4 md:gap-8 overflow-hidden min-h-0">

                {/* 左側：製作中 */}
                <div className="flex flex-col bg-gray-900/50 rounded-2xl md:rounded-3xl border border-gray-700 overflow-hidden relative h-1/2 md:h-full">
                    <div className="bg-gray-800/50 p-3 md:p-4 border-b border-gray-600 flex items-center justify-center gap-3 shrink-0">
                        <Utensils className="w-6 h-6 md:w-10 md:h-10 text-orange-500 animate-pulse" />
                        <h2 className="text-2xl md:text-4xl font-bold text-gray-300">
                            製作中 <span className="text-sm text-gray-500 font-normal ml-2">Preparing</span>
                        </h2>
                    </div>
                    <div className="flex-1 p-2 md:p-6 overflow-y-auto relative">
                        {prepOrders.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-600">
                                <Coffee className="w-16 h-16 mb-4 opacity-50" />
                                <p className="text-xl font-bold">目前沒有排隊訂單</p>
                                <p className="text-sm opacity-70">Enjoy your day!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 pb-10">
                                {prepOrders.map(order => {
                                    const isPrep = order.status === 'Preparing';
                                    return (
                                        <div
                                            key={order.id}
                                            className={`p-3 md:p-4 rounded-lg md:rounded-xl flex items-center justify-between backdrop-blur-sm border transition-all ${isPrep
                                                ? 'border-l-[6px] border-l-orange-500 bg-gradient-to-r from-orange-500/10 to-transparent border-white/10'
                                                : 'border-l-[6px] border-l-gray-600 bg-white/5 border-white/10 opacity-80'
                                                }`}
                                        >
                                            <span
                                                className={`text-2xl md:text-3xl lg:text-4xl font-black ${isPrep ? 'text-orange-500 drop-shadow-[0_0_20px_rgba(249,115,22,0.6)]' : 'text-gray-400'
                                                    }`}
                                                style={{ fontFamily: "'Courier Prime', monospace", letterSpacing: '1px' }}
                                            >
                                                {order.id.split('-')[1]}
                                            </span>
                                            <div className="flex flex-col items-end gap-1">
                                                {isPrep ? (
                                                    <div className="flex items-center gap-1">
                                                        <CookingAnimation variant="cooking" size="sm" />
                                                        <span className="text-[10px] md:text-xs text-white bg-orange-600 px-1.5 py-0.5 rounded font-bold whitespace-nowrap">
                                                            製作中
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1">
                                                        <CookingAnimation variant="waiting" size="sm" />
                                                        <span className="text-[10px] md:text-xs text-gray-400 border border-gray-600 px-1.5 py-0.5 rounded whitespace-nowrap">
                                                            排隊中
                                                        </span>
                                                    </div>
                                                )}
                                                {/* 進度條暗示 */}
                                                <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${isPrep ? 'bg-orange-500 progress-bar' : 'bg-gray-600 w-1/4'}`}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none" />
                    </div>
                </div>

                {/* 右側：請取餐 */}
                <div
                    className={`flex flex-col bg-gray-900/50 rounded-2xl md:rounded-3xl border-2 border-green-500/50 overflow-hidden relative shadow-[0_0_30px_rgba(34,197,94,0.15)] h-1/2 md:h-full transition-all ${flashActive ? 'animate-pulse bg-green-900/30' : ''
                        }`}
                >
                    <div className="bg-green-900/30 p-3 md:p-4 border-b border-green-500/30 flex items-center justify-center gap-3 shrink-0">
                        <CheckCircle className="w-6 h-6 md:w-10 md:h-10 text-green-400" />
                        <h2 className="text-2xl md:text-4xl font-bold text-green-400 drop-shadow-[0_0_20px_rgba(34,197,94,0.6)] animate-pulse">
                            請取餐 <span className="text-sm text-green-200/50 font-normal ml-2">Ready</span>
                        </h2>
                    </div>
                    <div className="flex-1 p-2 md:p-6 overflow-y-auto relative">
                        {readyOrders.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-green-800">
                                <CheckCircle className="w-16 h-16 mb-4 opacity-50" />
                                <p className="text-xl font-bold">餐點都取走囉</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 pb-10">
                                {readyOrders.map(order => {
                                    const isNew = newReadyIds.has(order.id);
                                    return (
                                        <div
                                            key={order.id}
                                            className={`border-2 border-green-500 bg-green-500/15 p-4 md:p-6 rounded-xl md:rounded-2xl flex items-center justify-between shadow-[0_0_30px_rgba(34,197,94,0.2)] ${isNew ? 'animate-slide-in-bounce animate-pulse-glow' : ''}`}
                                        >
                                            <div className="flex flex-col">
                                                <span
                                                    className="text-4xl md:text-5xl lg:text-6xl font-black text-green-400 drop-shadow-[0_0_20px_rgba(34,197,94,0.6)]"
                                                    style={{ fontFamily: "'Courier Prime', monospace", letterSpacing: '1px' }}
                                                >
                                                    {order.id.split('-')[1]}
                                                </span>
                                                <span className="text-xs md:text-sm text-green-100/70 mt-1 font-bold">
                                                    請至櫃台付款
                                                </span>
                                            </div>
                                            <div className={`text-2xl md:text-4xl text-green-400 ml-2 ${isNew ? 'animate-bounce' : ''}`}>
                                                {isNew ? '🎉' : '→'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none" />
                    </div>
                </div>
            </main>

            {/* Fullscreen Button */}
            <button
                onClick={toggleFullScreen}
                className="fixed bottom-4 right-4 text-gray-500 hover:text-white p-2 transition opacity-30 hover:opacity-100 z-50"
            >
                <Maximize className="w-6 h-6" />
            </button>
        </div>
    );
}

export default DisplayApp;
