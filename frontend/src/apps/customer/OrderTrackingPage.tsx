import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Clock, ChefHat, CheckCircle, Package, ArrowLeft, Loader2 } from 'lucide-react';

interface OrderItem {
    name: string;
    quantity: number;
    price: number;
}

interface OrderData {
    id: string;
    status: string;
    customerInfo: { class: string; name: string };
    items: OrderItem[];
    totalPrice: number;
    note?: string;
    createdAt: { seconds: number };
}

const STATUS_STEPS = [
    { key: 'Pending', label: '待處理', icon: Clock, color: 'text-gray-400' },
    { key: 'Preparing', label: '製作中', icon: ChefHat, color: 'text-orange-400' },
    { key: 'Completed', label: '待取餐', icon: CheckCircle, color: 'text-green-400' },
    { key: 'Paid', label: '已完成', icon: Package, color: 'text-blue-400' },
];

export function OrderTrackingPage() {
    const { classId, orderId } = useParams<{ classId: string; orderId: string }>();
    const [order, setOrder] = useState<OrderData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!classId || !orderId) {
            setError('無效的訂單連結');
            setLoading(false);
            return;
        }

        const orderRef = doc(db, `kitchens/${classId}/orders`, orderId);
        const unsubscribe = onSnapshot(
            orderRef,
            (snap) => {
                if (snap.exists()) {
                    setOrder({ id: snap.id, ...snap.data() } as OrderData);
                } else {
                    setError('找不到此訂單');
                }
                setLoading(false);
            },
            (err) => {
                console.error('Order tracking error:', err);
                setError('載入訂單時發生錯誤');
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [classId, orderId]);

    const currentStepIndex = STATUS_STEPS.findIndex(s => s.key === order?.status);
    const isCompleted = order?.status === 'Paid';

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
                <div className="text-red-400 text-xl mb-4">{error}</div>
                <Link
                    to="/"
                    className="text-orange-400 hover:text-orange-300 flex items-center gap-2"
                >
                    <ArrowLeft className="w-5 h-5" />
                    返回首頁
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
            <div className="max-w-lg mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${isCompleted ? 'bg-green-500/20' : 'bg-orange-500/20'
                        }`}>
                        {isCompleted ? (
                            <CheckCircle className="w-10 h-10 text-green-400" />
                        ) : (
                            <ChefHat className="w-10 h-10 text-orange-400" />
                        )}
                    </div>
                    <h1 className="text-2xl font-black text-white mb-2">
                        訂單 #{order?.id.split('-')[1] || order?.id}
                    </h1>
                    <p className="text-gray-400">
                        {order?.customerInfo.class} - {order?.customerInfo.name}
                    </p>
                </div>

                {/* Progress Steps */}
                <div className="bg-gray-800 rounded-2xl p-6 mb-6 border border-gray-700">
                    <div className="relative">
                        {STATUS_STEPS.map((step, index) => {
                            const Icon = step.icon;
                            const isActive = index <= currentStepIndex;
                            const isCurrent = index === currentStepIndex;

                            return (
                                <div key={step.key} className="flex items-center mb-6 last:mb-0">
                                    {/* Icon */}
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${isActive
                                        ? isCurrent
                                            ? 'bg-orange-500 border-orange-500 shadow-lg shadow-orange-500/30'
                                            : 'bg-green-500/20 border-green-500'
                                        : 'bg-gray-700 border-gray-600'
                                        }`}>
                                        <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                                    </div>

                                    {/* Label */}
                                    <div className="ml-4 flex-1">
                                        <div className={`font-bold ${isActive ? 'text-white' : 'text-gray-500'}`}>
                                            {step.label}
                                        </div>
                                        {isCurrent && !isCompleted && (
                                            <div className="text-orange-400 text-sm animate-pulse">
                                                目前狀態
                                            </div>
                                        )}
                                    </div>

                                    {/* Check mark */}
                                    {isActive && !isCurrent && (
                                        <CheckCircle className="w-6 h-6 text-green-400" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Order Details */}
                <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 mb-6">
                    <h2 className="font-bold text-gray-300 mb-4">訂單內容</h2>
                    <div className="space-y-3">
                        {order?.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                                <span className="text-gray-300">
                                    {item.name} x {item.quantity}
                                </span>
                                <span className="text-orange-400 font-bold">
                                    ${item.price * item.quantity}
                                </span>
                            </div>
                        ))}
                        <div className="border-t border-gray-700 pt-3 flex justify-between font-bold">
                            <span className="text-white">總計</span>
                            <span className="text-orange-400 text-xl">${order?.totalPrice}</span>
                        </div>
                    </div>
                    {order?.note && (
                        <div className="mt-4 p-3 bg-red-900/30 rounded-lg text-red-300 text-sm">
                            備註：{order.note}
                        </div>
                    )}
                </div>

                {/* Notification */}
                {order?.status === 'Completed' && (
                    <div className="bg-green-500/20 border border-green-500/50 rounded-2xl p-4 mb-6 text-center">
                        <div className="text-green-400 font-bold text-lg mb-1">
                            🎉 您的餐點已完成！
                        </div>
                        <div className="text-green-300 text-sm">
                            請至取餐區取餐
                        </div>
                    </div>
                )}

                {/* Back Button */}
                <Link
                    to={`/order/${classId}`}
                    className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-xl transition"
                >
                    <ArrowLeft className="w-5 h-5" />
                    繼續點餐
                </Link>
            </div>
        </div>
    );
}

export default OrderTrackingPage;
