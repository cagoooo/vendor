import { useMemo } from 'react';

interface CookingAnimationProps {
    variant?: 'cooking' | 'waiting';
    size?: 'sm' | 'md' | 'lg';
}

export function CookingAnimation({ variant = 'cooking', size = 'md' }: CookingAnimationProps) {
    const sizeClasses = useMemo(() => {
        switch (size) {
            case 'sm': return 'w-4 h-4 text-xs';
            case 'lg': return 'w-8 h-8 text-lg';
            default: return 'w-6 h-6 text-sm';
        }
    }, [size]);

    if (variant === 'waiting') {
        return (
            <div className={`relative ${sizeClasses} flex items-center justify-center`}>
                {/* Flame animation for waiting orders */}
                <span className="animate-flame text-orange-400">🔥</span>
                <style>{`
                    @keyframes flame {
                        0%, 100% { transform: scale(1) translateY(0); opacity: 0.8; }
                        50% { transform: scale(1.2) translateY(-2px); opacity: 1; }
                    }
                    .animate-flame {
                        animation: flame 0.8s ease-in-out infinite;
                    }
                `}</style>
            </div>
        );
    }

    // Cooking animation with pan
    return (
        <div className={`relative ${sizeClasses} flex items-center justify-center`}>
            <span className="animate-cooking">🍳</span>
            {/* Steam particles */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-0.5">
                <span className="animate-steam-1 text-[8px] opacity-60">~</span>
                <span className="animate-steam-2 text-[8px] opacity-60">~</span>
                <span className="animate-steam-3 text-[8px] opacity-60">~</span>
            </div>
            <style>{`
                @keyframes cooking {
                    0%, 100% { transform: rotate(-5deg); }
                    50% { transform: rotate(5deg); }
                }
                @keyframes steam {
                    0% { transform: translateY(0) scale(1); opacity: 0.6; }
                    100% { transform: translateY(-8px) scale(1.5); opacity: 0; }
                }
                .animate-cooking {
                    animation: cooking 0.4s ease-in-out infinite;
                    display: inline-block;
                }
                .animate-steam-1 {
                    animation: steam 1.2s ease-out infinite;
                }
                .animate-steam-2 {
                    animation: steam 1.2s ease-out infinite 0.2s;
                }
                .animate-steam-3 {
                    animation: steam 1.2s ease-out infinite 0.4s;
                }
            `}</style>
        </div>
    );
}

export default CookingAnimation;
