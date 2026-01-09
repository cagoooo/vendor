/**
 * 班級選擇頁面
 * 顧客可以從這裡選擇要點餐的班級
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllKitchens, type Kitchen } from '../../services/classApi';
import { Loader2, Store, ChevronRight, MapPin, Clock, ShoppingBag } from 'lucide-react';

export function ClassSelectorPage() {
    const [kitchens, setKitchens] = useState<Kitchen[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadKitchens();
    }, []);

    const loadKitchens = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await getAllKitchens();
            if (result.status === 'success' && result.data) {
                setKitchens(result.data);
            } else {
                setError(result.message || '載入失敗');
            }
        } catch {
            setError('網路錯誤');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex flex-col items-center justify-center">
                <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-r from-orange-400 to-red-400 animate-pulse" />
                    <Loader2 className="w-10 h-10 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white animate-spin" />
                </div>
                <p className="mt-6 text-gray-600 font-medium animate-pulse">載入攤位資訊...</p>
            </div>
        );
    }

    if (error || kitchens.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col text-white">
                {/* 主內容 */}
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <div className="text-center max-w-md">
                        {/* 應用程式名稱 - 符合 OAuth 要求 */}
                        <h1 className="text-2xl font-black text-orange-500 mb-8">🍽️ 校園點餐系統</h1>

                        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-800 flex items-center justify-center border-2 border-gray-700">
                            <Store className="w-12 h-12 text-gray-500" />
                        </div>
                        <h2 className="text-3xl font-black mb-3">{error ? '載入失敗' : '尚無攤位開放'}</h2>
                        <p className="text-gray-400 mb-8">{error || '目前沒有班級開放點餐，請稍後再來！'}</p>
                        <button
                            onClick={loadKitchens}
                            className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-full font-bold text-lg shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all hover:scale-105"
                        >
                            重新整理
                        </button>
                    </div>
                </div>

                {/* 頁尾 - 符合 OAuth 隱私權政策要求 */}
                <footer className="bg-gray-950 text-gray-400 py-6 border-t border-gray-800">
                    <div className="max-w-4xl mx-auto px-4 text-center">
                        <p className="text-sm mb-3">
                            校園點餐系統是專為校慶園遊會設計的線上點餐平台，提供即時叫號、快速取餐等服務。
                        </p>
                        <div className="flex justify-center gap-4 text-xs">
                            <a href={`${import.meta.env.BASE_URL}privacy.html`} className="text-orange-400 hover:text-orange-300 underline" target="_blank" rel="noopener noreferrer">
                                🔒 隱私權政策
                            </a>
                            <span className="text-gray-600">|</span>
                            <a href={`${import.meta.env.BASE_URL}terms.html`} className="text-orange-400 hover:text-orange-300 underline" target="_blank" rel="noopener noreferrer">
                                📋 服務條款
                            </a>
                        </div>
                        <p className="text-xs text-gray-600 mt-3">
                            © 2026 校園點餐系統. All rights reserved.
                        </p>
                    </div>
                </footer>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-orange-50/30">
            {/* Hero Banner */}
            <div className="relative h-56 sm:h-64 md:h-72 overflow-hidden">
                <img
                    src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1200&auto=format&fit=crop"
                    className="w-full h-full object-cover"
                    alt="Food Banner"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                    <div className="max-w-4xl mx-auto text-center">
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-3">
                            <span className="text-4xl sm:text-5xl mr-3">🎈</span>
                            校園點餐系統
                        </h1>
                        <p className="text-white/80 text-sm sm:text-base">
                            選擇您想點餐的攤位
                        </p>
                    </div>
                </div>
            </div>

            {/* 班級列表 */}
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="flex items-center gap-3 mb-6">
                    <ShoppingBag className="w-6 h-6 text-orange-500" />
                    <h2 className="text-xl font-bold text-gray-800">選擇攤位</h2>
                    <span className="text-sm text-gray-400">({kitchens.length} 個攤位)</span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    {kitchens.map(kitchen => (
                        <Link
                            key={kitchen.id}
                            to={`/order/${kitchen.classId}`}
                            className={`group relative bg-white rounded-2xl shadow-lg shadow-gray-200/50 border border-gray-100 overflow-hidden transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] ${kitchen.isOpen ? '' : 'opacity-60'
                                }`}
                        >
                            {/* 狀態標籤 */}
                            <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold ${kitchen.isOpen
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-500'
                                }`}>
                                {kitchen.isOpen ? '營業中' : '休息中'}
                            </div>

                            <div className="p-5">
                                {/* 班級名稱 */}
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-orange-200">
                                        {kitchen.className.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-800 group-hover:text-orange-600 transition-colors">
                                            {kitchen.className}
                                        </h3>
                                        {kitchen.ownerName && (
                                            <p className="text-sm text-gray-400">
                                                負責人：{kitchen.ownerName}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* 資訊列 */}
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <MapPin className="w-4 h-4" />
                                        攤位 {kitchen.classId}
                                    </span>
                                    {kitchen.isOpen && (
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            可點餐
                                        </span>
                                    )}
                                </div>

                                {/* 進入按鈕提示 */}
                                <div className="absolute right-5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ChevronRight className="w-6 h-6 text-orange-500" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* 快速連結 */}
            <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-30">
                <Link
                    to="/kitchen"
                    className="bg-gray-800 hover:bg-orange-500 text-white p-4 rounded-full shadow-xl transition-all hover:scale-110 active:scale-95"
                    title="進入廚房管理"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                        <circle cx="12" cy="12" r="3" />
                    </svg>
                </Link>
            </div>

            {/* 頁尾 */}
            <footer className="bg-gray-900 text-gray-400 py-8 mt-8">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <h2 className="text-xl font-bold text-white mb-2">🍽️ 校園點餐系統</h2>
                    <p className="text-sm mb-4 max-w-md mx-auto">
                        校園點餐系統是專為校慶園遊會設計的線上點餐平台，提供即時叫號、快速取餐等服務。
                    </p>
                    <div className="flex justify-center gap-4 text-xs">
                        <a href={`${import.meta.env.BASE_URL}privacy.html`} className="text-orange-400 hover:text-orange-300 underline" target="_blank" rel="noopener noreferrer">
                            🔒 隱私權政策
                        </a>
                        <span className="text-gray-600">|</span>
                        <a href={`${import.meta.env.BASE_URL}terms.html`} className="text-orange-400 hover:text-orange-300 underline" target="_blank" rel="noopener noreferrer">
                            📋 服務條款
                        </a>
                    </div>
                    <p className="text-xs text-gray-600 mt-4">
                        © 2026 校園點餐系統. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}

export default ClassSelectorPage;
