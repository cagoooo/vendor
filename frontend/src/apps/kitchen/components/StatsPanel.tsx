import { DollarSign, ShoppingBag, TrendingUp } from 'lucide-react';
import { Bar, Doughnut } from 'react-chartjs-2';

interface StatsData {
    revenue: number;
    orderCount: number;
    ranking: Array<{ name: string; qty: number }>;
}

interface StatsPanelProps {
    stats: StatsData;
}

export function StatsPanel({ stats }: StatsPanelProps) {
    const totalQty = stats.ranking.reduce((a, c) => a + c.qty, 0);

    return (
        <div className="max-w-6xl mx-auto">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-lg">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">總營收</p>
                    <p className="text-3xl md:text-4xl font-black text-green-400 mt-2 flex items-center gap-2">
                        <DollarSign className="w-8 h-8" />
                        {stats.revenue.toLocaleString()}
                    </p>
                </div>
                <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-lg">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">總單量</p>
                    <p className="text-4xl font-black text-blue-400 mt-2 flex items-center gap-2">
                        <ShoppingBag className="w-8 h-8" />
                        {stats.orderCount}
                    </p>
                </div>
                <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 shadow-lg">
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">平均客單價</p>
                    <p className="text-3xl md:text-4xl font-black text-purple-400 mt-2 flex items-center gap-2">
                        <TrendingUp className="w-8 h-8" />
                        ${stats.orderCount > 0 ? Math.round(stats.revenue / stats.orderCount) : 0}
                    </p>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="lg:col-span-2 bg-gray-800 p-4 md:p-6 rounded-2xl border border-gray-700 shadow-lg">
                    <h3 className="font-bold text-gray-200 mb-4">熱銷排行</h3>
                    <div className="h-64 md:h-72">
                        <Bar
                            data={{
                                labels: stats.ranking.slice(0, 10).map(i => i.name),
                                datasets: [{
                                    data: stats.ranking.slice(0, 10).map(i => i.qty),
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
                                labels: stats.ranking.slice(0, 5).map(i => i.name),
                                datasets: [{
                                    data: stats.ranking.slice(0, 5).map(i => i.qty),
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
                        {stats.ranking.map((item, idx) => (
                            <tr key={idx} className="border-b border-gray-700 hover:bg-gray-700/50">
                                <td className="px-6 py-4 font-mono text-gray-500">#{idx + 1}</td>
                                <td className="px-6 py-4 font-bold text-gray-200">{item.name}</td>
                                <td className="px-6 py-4 text-right">
                                    <span className="bg-gray-700 text-orange-400 px-2 py-1 rounded font-bold">
                                        {item.qty}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right text-gray-500">
                                    {totalQty > 0 ? ((item.qty / totalQty) * 100).toFixed(1) : 0}%
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
