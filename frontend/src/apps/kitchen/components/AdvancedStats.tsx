import { useState, useEffect } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { Download, Calendar, TrendingUp, Clock, ShoppingBag, DollarSign } from 'lucide-react';
import {
    getSalesReport,
    getHourlyDistribution,
    exportToCSV,
    getDateRange,
    type ReportData,
    type HourlyData,
} from '../../../services/reportApi';

type Period = 'day' | 'week' | 'month';

interface AdvancedStatsProps {
    classId: string;
}

export function AdvancedStats({ classId }: AdvancedStatsProps) {
    const [period, setPeriod] = useState<Period>('week');
    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);

    useEffect(() => {
        loadData();
    }, [classId, period]);

    const loadData = async () => {
        setLoading(true);
        try {
            const { start, end } = getDateRange(period);
            const report = await getSalesReport(classId, start, end);
            setReportData(report);

            // Load hourly data for today
            const today = new Date().toISOString().slice(0, 10);
            const hourly = await getHourlyDistribution(classId, today);
            setHourlyData(hourly);
        } catch (error) {
            console.error('Failed to load report data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (reportData) {
            const periodLabel = period === 'day' ? '今日' : period === 'week' ? '本週' : '本月';
            exportToCSV(reportData, `銷售報表-${periodLabel}-${new Date().toISOString().slice(0, 10)}`);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    // Chart data for sales trend
    const trendChartData = {
        labels: reportData?.dailySales.map(d => d.date.slice(5)) || [],
        datasets: [
            {
                label: '營收',
                data: reportData?.dailySales.map(d => d.revenue) || [],
                borderColor: 'rgb(249, 115, 22)',
                backgroundColor: 'rgba(249, 115, 22, 0.1)',
                fill: true,
                tension: 0.3,
            },
        ],
    };

    // Chart data for hourly distribution
    const hourlyChartData = {
        labels: hourlyData.map(d => `${d.hour}:00`),
        datasets: [
            {
                label: '訂單數',
                data: hourlyData.map(d => d.count),
                backgroundColor: 'rgba(59, 130, 246, 0.7)',
                borderRadius: 4,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(255,255,255,0.05)' },
                ticks: { color: '#9ca3af' },
            },
            x: {
                grid: { display: false },
                ticks: { color: '#9ca3af' },
            },
        },
    };

    return (
        <div className="space-y-6">
            {/* Header with Period Selector */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-orange-400" />
                    進階報表分析
                </h2>
                <div className="flex items-center gap-2">
                    {/* Period Buttons */}
                    <div className="flex bg-gray-700 rounded-lg p-1">
                        {(['day', 'week', 'month'] as Period[]).map((p) => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${period === p
                                        ? 'bg-orange-500 text-white'
                                        : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                {p === 'day' ? '今日' : p === 'week' ? '本週' : '本月'}
                            </button>
                        ))}
                    </div>
                    {/* Export Button */}
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition"
                    >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">匯出 CSV</span>
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                        <DollarSign className="w-4 h-4" />
                        總營收
                    </div>
                    <div className="text-2xl font-bold text-green-400">
                        ${reportData?.totalRevenue.toLocaleString() || 0}
                    </div>
                </div>
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                        <ShoppingBag className="w-4 h-4" />
                        總單量
                    </div>
                    <div className="text-2xl font-bold text-blue-400">
                        {reportData?.totalOrders || 0}
                    </div>
                </div>
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                        <TrendingUp className="w-4 h-4" />
                        平均客單價
                    </div>
                    <div className="text-2xl font-bold text-purple-400">
                        ${reportData?.averageOrderValue || 0}
                    </div>
                </div>
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                        <Calendar className="w-4 h-4" />
                        統計天數
                    </div>
                    <div className="text-2xl font-bold text-orange-400">
                        {reportData?.dailySales.length || 0} 天
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sales Trend */}
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                    <h3 className="font-bold text-gray-200 mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-orange-400" />
                        營收趨勢
                    </h3>
                    <div className="h-64">
                        {reportData && reportData.dailySales.length > 0 ? (
                            <Line data={trendChartData} options={chartOptions} />
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-500">
                                暫無數據
                            </div>
                        )}
                    </div>
                </div>

                {/* Hourly Distribution */}
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                    <h3 className="font-bold text-gray-200 mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-400" />
                        今日時段分布
                    </h3>
                    <div className="h-64">
                        {hourlyData.length > 0 ? (
                            <Bar data={hourlyChartData} options={chartOptions} />
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-500">
                                暫無數據
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Top Items Table */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-700">
                    <h3 className="font-bold text-gray-200">熱銷品項排行</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-700/50 text-gray-400">
                            <tr>
                                <th className="px-4 py-3 text-left">排名</th>
                                <th className="px-4 py-3 text-left">品項</th>
                                <th className="px-4 py-3 text-right">銷售數量</th>
                                <th className="px-4 py-3 text-right">佔比</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData?.topItems.map((item, idx) => {
                                const total = reportData.topItems.reduce((a, b) => a + b.qty, 0);
                                const percent = total > 0 ? ((item.qty / total) * 100).toFixed(1) : 0;
                                return (
                                    <tr key={item.name} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                                        <td className="px-4 py-3 text-gray-500">#{idx + 1}</td>
                                        <td className="px-4 py-3 text-white font-medium">{item.name}</td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="bg-orange-500/20 text-orange-400 px-2 py-1 rounded">
                                                {item.qty}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-400">{percent}%</td>
                                    </tr>
                                );
                            })}
                            {(!reportData?.topItems || reportData.topItems.length === 0) && (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                                        暫無銷售數據
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
