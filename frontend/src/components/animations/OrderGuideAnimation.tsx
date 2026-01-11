import { useEffect, useState } from 'react';
import { Receipt } from 'lucide-react';

interface OrderGuideAnimationProps {
    isActive: boolean;
    onComplete?: () => void;
}

export function OrderGuideAnimation({ isActive, onComplete }: OrderGuideAnimationProps) {
    const [phase, setPhase] = useState<'flying' | 'pulsing' | 'done'>('flying');

    useEffect(() => {
        if (!isActive) {
            setPhase('flying');
            return;
        }

        // Phase 1: Flying animation (1.5s)
        const flyingTimer = setTimeout(() => {
            setPhase('pulsing');
        }, 1500);

        // Phase 2: Pulsing at target (2s)
        const pulsingTimer = setTimeout(() => {
            setPhase('done');
            onComplete?.();
        }, 3500);

        return () => {
            clearTimeout(flyingTimer);
            clearTimeout(pulsingTimer);
        };
    }, [isActive, onComplete]);

    if (!isActive || phase === 'done') return null;

    return (
        <>
            {/* CSS Animations */}
            <style>{`
                @keyframes flyToOrders {
                    0% {
                        bottom: 80px;
                        right: 50%;
                        transform: translateX(50%) scale(1);
                        opacity: 1;
                    }
                    30% {
                        bottom: 200px;
                        right: 40%;
                        transform: translateX(50%) scale(1.2);
                        opacity: 1;
                    }
                    70% {
                        bottom: 60%;
                        right: 20%;
                        transform: translateX(0) scale(0.8);
                        opacity: 0.9;
                    }
                    100% {
                        bottom: calc(100% - 50px);
                        right: 16px;
                        transform: translateX(0) scale(0.6);
                        opacity: 0;
                    }
                }
                @keyframes targetPulse {
                    0%, 100% {
                        transform: scale(1);
                        box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.7);
                    }
                    50% {
                        transform: scale(1.1);
                        box-shadow: 0 0 0 20px rgba(249, 115, 22, 0);
                    }
                }
                @keyframes arrowBounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-8px); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>

            {/* Flying receipt icon */}
            {phase === 'flying' && (
                <div
                    className="fixed z-[100] pointer-events-none"
                    style={{
                        animation: 'flyToOrders 1.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                        bottom: '80px',
                        right: '50%',
                    }}
                >
                    <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 rounded-2xl shadow-2xl">
                        <Receipt className="w-8 h-8" />
                    </div>
                </div>
            )}

            {/* Target highlight on "我的訂單" button */}
            {phase === 'pulsing' && (
                <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-[99] pointer-events-none">
                    {/* Pulsing ring */}
                    <div
                        className="absolute inset-0 -m-2 rounded-full bg-orange-500/30"
                        style={{ animation: 'targetPulse 0.8s ease-in-out infinite' }}
                    />

                    {/* Arrow pointing down */}
                    <div
                        className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center"
                        style={{ animation: 'fadeIn 0.3s ease-out forwards' }}
                    >
                        <div
                            className="text-orange-500 text-2xl"
                            style={{ animation: 'arrowBounce 0.6s ease-in-out infinite' }}
                        >
                            ↑
                        </div>
                        <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap">
                            點這裡追蹤訂單！
                        </span>
                    </div>
                </div>
            )}
        </>
    );
}

export default OrderGuideAnimation;
