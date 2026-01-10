import { Flame, Clock, Settings } from 'lucide-react';
import type { Kitchen } from '../../../services/classApi';
import type { Tab } from '../types';
import { ClassSelector } from './ClassSelector';
import { LayoutDashboard, ChefHat, Package, PieChart } from 'lucide-react';
import { notificationSound } from '../../../services/notificationSound';
import Swal from 'sweetalert2';

export interface KitchenHeaderProps {
    // 班級相關
    isOwner: boolean;
    kitchens: Kitchen[];
    currentClassId: string | null;
    onClassSelect: (classId: string) => void;

    // 營業狀態
    isShopOpen: boolean;
    waitTime: number;
    onToggleShop: () => void;
    onWaitTimeChange: (value: number) => void;

    // Tab 控制
    activeTab: Tab;
    onTabChange: (tab: Tab) => void;

    // 用戶相關
    profile: { name?: string; email?: string; photoURL?: string } | null;
    onLogout: () => void;
    onClearAll: () => void;
}

/**
 * 廚房後台 Header 組件
 * 包含 Logo、班級選擇、營業狀態、等待時間和 Tab 導航
 */
export function KitchenHeader({
    isOwner,
    kitchens,
    currentClassId,
    onClassSelect,
    isShopOpen,
    waitTime,
    onToggleShop,
    onWaitTimeChange,
    activeTab,
    onTabChange,
    profile,
    onLogout,
    onClearAll,
}: KitchenHeaderProps) {

    const handleOpenSettings = () => {
        const soundSettings = notificationSound.getSettings();

        Swal.fire({
            title: '設定',
            html: `
                <div class="space-y-4 text-left">
                    ${profile ? `
                    <div class="flex items-center gap-3 bg-gray-700 rounded-lg p-3 mb-4">
                        ${profile.photoURL ? `<img src="${profile.photoURL}" class="w-10 h-10 rounded-full" />` : `<div class="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center font-bold text-white">${profile.name?.charAt(0) || 'U'}</div>`}
                        <div>
                            <div class="font-bold text-white">${profile.name || '使用者'}</div>
                            <div class="text-xs text-gray-400">${profile.email || ''}</div>
                        </div>
                    </div>
                    ` : ''}
                    
                    <!-- 音效設定區塊 -->
                    <div class="bg-gray-700 rounded-lg p-4 mb-4">
                        <div class="flex items-center justify-between mb-3">
                            <span class="text-white font-bold flex items-center gap-2">
                                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                                </svg>
                                訂單音效通知
                            </span>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="sound-toggle" class="sr-only peer" ${soundSettings.enabled ? 'checked' : ''}>
                                <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                            </label>
                        </div>
                        <div class="flex items-center gap-3">
                            <svg class="w-4 h-4 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                            </svg>
                            <input type="range" id="sound-volume" min="0" max="100" value="${Math.round(soundSettings.volume * 100)}" 
                                class="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-orange-500">
                            <span id="volume-label" class="text-white text-sm w-10 text-right">${Math.round(soundSettings.volume * 100)}%</span>
                        </div>
                        <button id="test-sound-btn" class="mt-3 w-full bg-gray-600 hover:bg-gray-500 text-white text-sm py-2 px-4 rounded-lg transition flex items-center justify-center gap-2">
                            🔔 測試音效
                        </button>
                    </div>
                    
                    ${isOwner ? `
                    <a href="#/admin" class="block w-full bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold py-3 px-4 rounded-lg text-center">
                        🔧 管理中心
                    </a>
                    <button id="clear-btn" class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg">
                        🗑️ 清除所有資料
                    </button>
                    ` : ''}
                    <button id="logout-btn" class="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg">
                        👋 登出
                    </button>
                </div>
            `,
            showConfirmButton: false,
            showCloseButton: true,
            background: '#1f2937',
            color: '#fff',
            didOpen: () => {
                // 音效開關
                const soundToggle = document.getElementById('sound-toggle') as HTMLInputElement;
                soundToggle?.addEventListener('change', (e) => {
                    notificationSound.setEnabled((e.target as HTMLInputElement).checked);
                });

                // 音量控制
                const volumeSlider = document.getElementById('sound-volume') as HTMLInputElement;
                const volumeLabel = document.getElementById('volume-label');
                volumeSlider?.addEventListener('input', (e) => {
                    const value = parseInt((e.target as HTMLInputElement).value) / 100;
                    notificationSound.setVolume(value);
                    if (volumeLabel) {
                        volumeLabel.textContent = `${Math.round(value * 100)}%`;
                    }
                });

                // 測試音效
                document.getElementById('test-sound-btn')?.addEventListener('click', () => {
                    notificationSound.playTest();
                });

                // 清除資料
                document.getElementById('clear-btn')?.addEventListener('click', () => {
                    Swal.close();
                    onClearAll();
                });

                // 登出
                document.getElementById('logout-btn')?.addEventListener('click', () => {
                    Swal.close();
                    onLogout();
                });
            },
        });
    };

    return (
        <header className="bg-gray-800 border-b border-gray-700 p-3 md:p-4 shadow-lg sticky top-0 z-20">
            <div className="max-w-7xl mx-auto space-y-3">
                {/* 上排：Logo + 班級 + 營業狀態 + 等待時間 */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 md:gap-4">
                        <h1 className="text-lg md:text-2xl font-black text-orange-500 tracking-wider flex items-center gap-1.5 md:gap-2">
                            <Flame className="w-5 h-5 md:w-6 md:h-6" />
                            <span className="hidden sm:inline">KITCHEN</span>
                        </h1>

                        {/* 班級切換（只有 owner 可見）*/}
                        {isOwner && kitchens.length > 0 && (
                            <ClassSelector
                                kitchens={kitchens}
                                currentClassId={currentClassId}
                                onSelect={onClassSelect}
                            />
                        )}
                    </div>

                    {/* 營業狀態 + 等待時間 */}
                    <div className="flex items-center gap-2">
                        {/* 營業狀態開關 */}
                        <button
                            onClick={onToggleShop}
                            className={`flex items-center gap-1.5 md:gap-3 rounded-lg md:rounded-xl px-2.5 py-2 md:px-4 md:py-2.5 transition-all shadow-lg ${isShopOpen
                                ? 'bg-gradient-to-r from-green-600 to-emerald-500 shadow-green-900/30'
                                : 'bg-gradient-to-r from-gray-600 to-gray-500 shadow-gray-900/30'
                                }`}
                        >
                            <div className={`relative w-9 h-5 md:w-12 md:h-7 rounded-full transition-all ${isShopOpen ? 'bg-green-400/30' : 'bg-gray-700'}`}>
                                <span className={`absolute w-4 h-4 md:w-5 md:h-5 bg-white rounded-full top-0.5 md:top-1 transition-all shadow-md ${isShopOpen ? 'right-0.5 md:right-1' : 'left-0.5 md:left-1'}`} />
                            </div>
                            <span className="text-white font-bold text-xs md:text-sm lg:text-base hidden sm:inline">
                                {isShopOpen ? '營業中' : '已暫停'}
                            </span>
                        </button>

                        {/* 等待時間 */}
                        <div className="flex items-center gap-1 md:gap-2 bg-gradient-to-r from-gray-700 to-gray-600 px-2 py-1.5 md:px-4 md:py-2.5 rounded-lg md:rounded-xl shadow-lg">
                            <Clock className="w-4 h-4 md:w-5 md:h-5 text-orange-400" />
                            <input
                                type="number"
                                value={waitTime}
                                onChange={e => onWaitTimeChange(parseInt(e.target.value) || 15)}
                                className="bg-gray-800 w-10 md:w-14 text-center text-white text-sm md:text-lg font-bold rounded py-0.5 md:py-1 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                min={1}
                                max={120}
                            />
                            <span className="text-white font-bold text-xs md:text-sm">分</span>
                        </div>

                        {/* 設定按鈕 */}
                        <button
                            onClick={handleOpenSettings}
                            className="text-gray-400 hover:text-white p-2 md:p-2.5 bg-gray-700 rounded-lg transition"
                            title="設定"
                        >
                            <Settings className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                    </div>
                </div>

                {/* 下排：Tabs */}
                <div className="flex overflow-x-auto pb-1 -mx-3 px-3 md:mx-0 md:px-0 scrollbar-hide">
                    <div className="flex bg-gray-700 rounded-lg p-1 gap-1 min-w-max">
                        {isOwner && (
                            <button
                                onClick={() => onTabChange('dashboard')}
                                className={`px-3 py-2 md:px-4 rounded-md font-bold text-xs md:text-sm flex items-center gap-1.5 md:gap-2 transition whitespace-nowrap ${activeTab === 'dashboard'
                                    ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                <LayoutDashboard className="w-4 h-4" />
                                總覽
                            </button>
                        )}
                        <button
                            onClick={() => onTabChange('orders')}
                            className={`px-3 py-2 md:px-4 rounded-md font-bold text-xs md:text-sm flex items-center gap-1.5 md:gap-2 transition whitespace-nowrap ${activeTab === 'orders'
                                ? 'bg-orange-600 text-white shadow-lg'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            <ChefHat className="w-4 h-4" />
                            接單
                        </button>
                        <button
                            onClick={() => onTabChange('inventory')}
                            className={`px-3 py-2 md:px-4 rounded-md font-bold text-xs md:text-sm flex items-center gap-1.5 md:gap-2 transition whitespace-nowrap ${activeTab === 'inventory'
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            <Package className="w-4 h-4" />
                            庫存
                        </button>
                        <button
                            onClick={() => onTabChange('stats')}
                            className={`px-3 py-2 md:px-4 rounded-md font-bold text-xs md:text-sm flex items-center gap-1.5 md:gap-2 transition whitespace-nowrap ${activeTab === 'stats'
                                ? 'bg-emerald-600 text-white shadow-lg'
                                : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            <PieChart className="w-4 h-4" />
                            戰情
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
