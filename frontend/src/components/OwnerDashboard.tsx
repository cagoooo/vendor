/**
 * Owner 儀表板元件 - 顯示所有班級廚房的統計
 * 點擊班級卡片可顯示該班級的詳細戰情
 */

import { useState, useEffect } from 'react';
import { getAllKitchensStats, type KitchenStats, type AllKitchensStats } from '../services/ownerApi';
import { getClassStats } from '../services/classApi';
import {
    School, DollarSign, ShoppingBag,
    RefreshCw, Clock, CheckCircle2, AlertCircle,
    ChefHat, Coffee, Loader2, ArrowLeft, TrendingUp, PieChart
} from 'lucide-react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

interface OwnerDashboardProps {
    // Props 保留擴充彈性
}

// 班級統計資料的品項排名
interface RankingItem {
    name: string;
    qty: number;
}

// 班級統計資料結構
interface ClassStats {
    revenue: number;
    orderCount: number;
    ranking: RankingItem[];
}

export function OwnerDashboard(_props: OwnerDashboardProps) {
    const [stats, setStats] = useState<AllKitchensStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 單一班級戰情視圖
    const [selectedKitchen, setSelectedKitchen] = useState<KitchenStats | null>(null);
    const [classStats, setClassStats] = useState<ClassStats | null>(null);
    const [loadingClassStats, setLoadingClassStats] = useState(false);

    const loadStats = async () => {
        setLoading(true);
        setError(null);
        const result = await getAllKitchensStats();
        if (result.status === 'success' && result.data) {
            setStats(result.data);
        } else {
            setError(result.message || '載入失敗');
        }
        setLoading(false);
    };

    // 載入單一班級戰情
    const loadClassStats = async (classId: string) => {
        setLoadingClassStats(true);
        const result = await getClassStats(classId);
        if (result.status === 'success') {
            setClassStats(result.data);
        }
        setLoadingClassStats(false);
    };

    // 處理班級卡片點擊
    const handleKitchenClick = (kitchen: KitchenStats) => {
        setSelectedKitchen(kitchen);
        loadClassStats(kitchen.classId);
    };

    // 返回全體總覽
    const handleBackToOverview = () => {
        setSelectedKitchen(null);
        setClassStats(null);
    };

    useEffect(() => {
        loadStats();
        // 每 30 秒自動刷新
        const interval = setInterval(loadStats, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading && !stats) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-20 text-red-400">
                <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>{error}</p>
                <button
                    onClick={loadStats}
                    className="mt-4 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition"
                >
                    重試
                </button>
            </div>
        );
    }

    if (!stats) return null;

    // 如果選擇了單一班級，顯示該班級的戰情
    if (selectedKitchen) {
        return (
            <div className="space-y-6">
                {/* 返回按鈕 */}
                <button
                    onClick={handleBackToOverview}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span>返回總覽</span>
                </button>

                {/* 班級標題 */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
                            <PieChart className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white">{selectedKitchen.className} 戰情</h2>
                            <p className="text-sm text-gray-400">
                                負責人：{selectedKitchen.ownerName}
                                <span className={`ml-2 ${selectedKitchen.isOpen ? 'text-green-400' : 'text-gray-500'}`}>
                                    ● {selectedKitchen.isOpen ? '營業中' : '暫停'}
                                </span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => loadClassStats(selectedKitchen.classId)}
                        disabled={loadingClassStats}
                        className="text-gray-400 hover:text-white text-sm bg-gray-700 px-3 py-1.5 rounded-lg flex items-center gap-1 transition disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loadingClassStats ? 'animate-spin' : ''}`} />
                        刷新
                    </button>
                </div>

                {loadingClassStats ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                    </div>
                ) : classStats ? (
                    <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-lg">
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">總營收</p>
                                <p className="text-3xl md:text-4xl font-black text-green-400 mt-2 flex items-center gap-2">
                                    <DollarSign className="w-8 h-8" />
                                    {classStats.revenue.toLocaleString()}
                                </p>
                            </div>
                            <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-lg">
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">總單量</p>
                                <p className="text-4xl font-black text-blue-400 mt-2 flex items-center gap-2">
                                    <ShoppingBag className="w-8 h-8" />
                                    {classStats.orderCount}
                                </p>
                            </div>
                            <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-lg">
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">平均客單價</p>
                                <p className="text-3xl md:text-4xl font-black text-purple-400 mt-2 flex items-center gap-2">
                                    <TrendingUp className="w-8 h-8" />
                                    ${classStats.orderCount > 0 ? Math.round(classStats.revenue / classStats.orderCount) : 0}
                                </p>
                            </div>
                        </div>

                        {/* Charts */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 bg-gray-800 p-4 md:p-6 rounded-2xl border border-gray-700 shadow-lg">
                                <h3 className="font-bold text-gray-200 mb-4">熱銷排行</h3>
                                <div className="h-64 md:h-72">
                                    <Bar
                                        data={{
                                            labels: classStats.ranking.slice(0, 10).map((i) => i.name),
                                            datasets: [{
                                                data: classStats.ranking.slice(0, 10).map((i) => i.qty),
                                                backgroundColor: 'rgba(249, 115, 22, 0.7)',
                                                borderRadius: 4,
                                            }],
                                        }}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: { legend: { display: false } },
                                            scales: {
                                                y: { grid: { color: 'rgba(255,255,255,0.05)' } },
                                                x: { grid: { display: false } },
                                            },
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="lg:col-span-1 bg-gray-800 p-4 md:p-6 rounded-2xl border border-gray-700 shadow-lg">
                                <h3 className="font-bold text-gray-200 mb-4">銷售佔比</h3>
                                <div className="h-64">
                                    <Doughnut
                                        data={{
                                            labels: classStats.ranking.slice(0, 5).map((i) => i.name),
                                            datasets: [{
                                                data: classStats.ranking.slice(0, 5).map((i) => i.qty),
                                                backgroundColor: ['#f97316', '#3b82f6', '#10b981', '#a855f7', '#ec4899'],
                                                borderWidth: 0,
                                            }],
                                        }}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            cutout: '70%',
                                            plugins: {
                                                legend: {
                                                    position: 'bottom',
                                                    labels: { color: '#9ca3af', boxWidth: 10 },
                                                },
                                            },
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Ranking Table */}
                        <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-lg overflow-hidden">
                            <div className="p-4 border-b border-gray-700 bg-gray-800/50">
                                <h3 className="font-bold text-gray-200">詳細銷售報表</h3>
                            </div>
                            <table className="w-full text-sm text-left text-gray-400">
                                <thead className="text-xs text-gray-300 uppercase bg-gray-700/50">
                                    <tr>
                                        <th className="px-6 py-3">排名</th>
                                        <th className="px-6 py-3">品項名稱</th>
                                        <th className="px-6 py-3 text-right">銷售份數</th>
                                        <th className="px-6 py-3 text-right">銷售佔比</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {classStats.ranking.map((item, idx) => {
                                        const total = classStats.ranking.reduce((a, c) => a + c.qty, 0);
                                        return (
                                            <tr key={idx} className="border-b border-gray-700 hover:bg-gray-700/50">
                                                <td className="px-6 py-4 font-mono text-gray-500">#{idx + 1}</td>
                                                <td className="px-6 py-4 font-bold text-gray-200">{item.name}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="bg-gray-700 text-orange-400 px-2 py-1 rounded font-bold">
                                                        {item.qty}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right text-gray-500">
                                                    {total > 0 ? ((item.qty / total) * 100).toFixed(1) : 0}%
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-20 text-gray-500">
                        <PieChart className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p>尚無銷售資料</p>
                    </div>
                )}
            </div>
        );
    }

    // 總覽視圖
    return (
        <div className="space-y-6">
            {/* 總覽卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-green-600/20 to-green-900/30 p-5 rounded-2xl border border-green-700/50 shadow-lg">
                    <p className="text-green-300 text-xs font-bold uppercase tracking-wider">今日總營收</p>
                    <p className="text-3xl md:text-4xl font-black text-green-400 mt-2 flex items-center gap-2">
                        <DollarSign className="w-8 h-8" />
                        {stats.totalRevenue.toLocaleString()}
                    </p>
                </div>
                <div className="bg-gradient-to-br from-blue-600/20 to-blue-900/30 p-5 rounded-2xl border border-blue-700/50 shadow-lg">
                    <p className="text-blue-300 text-xs font-bold uppercase tracking-wider">今日總單量</p>
                    <p className="text-4xl font-black text-blue-400 mt-2 flex items-center gap-2">
                        <ShoppingBag className="w-8 h-8" />
                        {stats.totalOrderCount}
                    </p>
                </div>
                <div className="bg-gradient-to-br from-purple-600/20 to-purple-900/30 p-5 rounded-2xl border border-purple-700/50 shadow-lg">
                    <p className="text-purple-300 text-xs font-bold uppercase tracking-wider">班級廚房數</p>
                    <p className="text-4xl font-black text-purple-400 mt-2 flex items-center gap-2">
                        <School className="w-8 h-8" />
                        {stats.kitchens.length}
                    </p>
                </div>
                <div className="bg-gradient-to-br from-orange-600/20 to-orange-900/30 p-5 rounded-2xl border border-orange-700/50 shadow-lg">
                    <p className="text-orange-300 text-xs font-bold uppercase tracking-wider">營業中</p>
                    <p className="text-4xl font-black text-orange-400 mt-2 flex items-center gap-2">
                        <ChefHat className="w-8 h-8" />
                        {stats.activeKitchens}
                    </p>
                </div>
            </div>

            {/* 班級廚房列表 */}
            <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-lg overflow-hidden">
                <div className="p-4 border-b border-gray-700 bg-gray-800/50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-200 flex items-center gap-2">
                        <School className="w-5 h-5" />
                        各班級廚房狀態
                        <span className="text-xs text-gray-500 font-normal ml-2">
                            (點擊班級查看詳細戰情)
                        </span>
                    </h3>
                    <button
                        onClick={loadStats}
                        disabled={loading}
                        className="text-gray-400 hover:text-white text-sm bg-gray-700 px-3 py-1.5 rounded-lg flex items-center gap-1 transition disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        刷新
                    </button>
                </div>

                {stats.kitchens.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <School className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>尚無班級廚房</p>
                        <p className="text-sm mt-1">審核通過員工後會自動建立</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                        {stats.kitchens.map((kitchen) => (
                            <KitchenCard
                                key={kitchen.classId}
                                kitchen={kitchen}
                                onClick={() => handleKitchenClick(kitchen)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

interface KitchenCardProps {
    kitchen: KitchenStats;
    onClick?: () => void;
}

function KitchenCard({ kitchen, onClick }: KitchenCardProps) {
    const totalActiveOrders = kitchen.pendingOrderCount + kitchen.preparingOrderCount + kitchen.completedOrderCount;
    const hasUrgentOrders = kitchen.pendingOrderCount > 0;

    return (
        <div
            onClick={onClick}
            className={`
                bg-gray-900/50 rounded-xl p-4 border transition cursor-pointer group
                ${kitchen.isOpen
                    ? hasUrgentOrders
                        ? 'border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.15)] hover:border-orange-400'
                        : 'border-gray-700 hover:border-purple-500/50'
                    : 'border-gray-700/50 opacity-60 hover:opacity-80'
                }
            `}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div>
                    <h4 className="font-bold text-white text-lg group-hover:text-purple-400 transition">{kitchen.className}</h4>
                    <p className="text-xs text-gray-500">{kitchen.ownerName}</p>
                </div>
                <div className="flex items-center gap-1">
                    <span
                        className={`
                            w-2 h-2 rounded-full
                            ${kitchen.isOpen ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}
                        `}
                    />
                    <span className={`text-xs font-bold ${kitchen.isOpen ? 'text-green-400' : 'text-gray-500'}`}>
                        {kitchen.isOpen ? '營業中' : '暫停'}
                    </span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-gray-800/50 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-gray-500 uppercase">營收</p>
                    <p className="text-lg font-bold text-green-400">${kitchen.todayRevenue.toLocaleString()}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-gray-500 uppercase">單量</p>
                    <p className="text-lg font-bold text-blue-400">{kitchen.todayOrderCount}</p>
                </div>
            </div>

            {/* Order Status */}
            {totalActiveOrders > 0 && (
                <div className="flex items-center gap-2 text-xs">
                    {kitchen.pendingOrderCount > 0 && (
                        <span className="flex items-center gap-1 bg-yellow-600/20 text-yellow-400 px-2 py-1 rounded-lg">
                            <Clock className="w-3 h-3" />
                            {kitchen.pendingOrderCount} 待處理
                        </span>
                    )}
                    {kitchen.preparingOrderCount > 0 && (
                        <span className="flex items-center gap-1 bg-orange-600/20 text-orange-400 px-2 py-1 rounded-lg">
                            <Coffee className="w-3 h-3" />
                            {kitchen.preparingOrderCount} 製作中
                        </span>
                    )}
                    {kitchen.completedOrderCount > 0 && (
                        <span className="flex items-center gap-1 bg-green-600/20 text-green-400 px-2 py-1 rounded-lg">
                            <CheckCircle2 className="w-3 h-3" />
                            {kitchen.completedOrderCount} 待取餐
                        </span>
                    )}
                </div>
            )}

            {totalActiveOrders === 0 && (
                <div className="text-xs text-gray-500 text-center py-1">
                    無待處理訂單
                </div>
            )}

            {/* 提示點擊查看戰情 */}
            <div className="mt-3 pt-3 border-t border-gray-700/50 text-xs text-purple-400 opacity-0 group-hover:opacity-100 transition flex items-center gap-1 justify-center">
                <PieChart className="w-3 h-3" />
                點擊查看詳細戰情
            </div>
        </div>
    );
}

export default OwnerDashboard;

