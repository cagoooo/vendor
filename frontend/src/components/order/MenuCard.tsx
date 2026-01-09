import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Minus, Flame, X, ZoomIn } from 'lucide-react';
import type { MenuItem } from '../../types';

interface MenuCardProps {
    item: MenuItem;
    isTrending?: boolean;
    quantity: number;
    onAdd: () => void;
    onRemove: () => void;
}

export function MenuCard({ item, isTrending, quantity, onAdd, onRemove }: MenuCardProps) {
    const isSoldOut = item.stock <= 0;
    const isLowStock = item.stock > 0 && item.stock <= 5;
    const isMaxReached = quantity >= item.stock;
    const [showLightbox, setShowLightbox] = useState(false);

    return (
        <>
            <div
                className={`group relative bg-white rounded-2xl border-2 transition-all duration-300 ${quantity > 0
                    ? 'border-orange-400 shadow-lg shadow-orange-100 scale-[1.01]'
                    : isSoldOut
                        ? 'border-gray-100 opacity-60'
                        : 'border-gray-100 hover:border-orange-200 hover:shadow-md'
                    }`}
            >
                <div className="flex items-center p-3 sm:p-4">
                    {/* 左側圖片區 */}
                    <div
                        className={`relative w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 flex-shrink-0 rounded-xl lg:rounded-2xl overflow-hidden bg-gradient-to-br from-orange-100 to-amber-100 ${item.imageUrl ? 'cursor-pointer' : ''}`}
                        onClick={() => item.imageUrl && setShowLightbox(true)}
                    >
                        {item.imageUrl ? (
                            <>
                                <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                />
                                {/* 放大提示 */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <ZoomIn className="w-6 h-6 text-white drop-shadow-lg" />
                                </div>
                            </>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl sm:text-4xl">
                                {item.category === 'main' ? '🍛' : item.category === 'drink' ? '🥤' : '🍰'}
                            </div>
                        )}

                        {/* 熱銷標籤 */}
                        {isTrending && !isSoldOut && (
                            <div className="absolute top-1 left-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm">
                                <Flame className="w-3 h-3" />
                                熱銷
                            </div>
                        )}

                        {/* 售完標籤 */}
                        {isSoldOut && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <span className="bg-gray-900 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                                    售完
                                </span>
                            </div>
                        )}
                    </div>

                    {/* 中間內容區 */}
                    <div className="flex-1 min-w-0 px-3 sm:px-4">
                        <h3 className="font-bold text-gray-800 text-base sm:text-lg lg:text-xl truncate mb-1">
                            {item.name}
                        </h3>

                        <div className="flex items-baseline gap-1 mb-2">
                            <span className="text-orange-500 text-sm lg:text-base font-medium">$</span>
                            <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-800">
                                {item.price}
                            </span>
                        </div>

                        {/* 庫存狀態 */}
                        {isLowStock && !isSoldOut && (
                            <span className="inline-block text-[11px] text-red-500 bg-red-50 px-2 py-0.5 rounded-full font-medium">
                                僅剩 {item.stock} 份
                            </span>
                        )}
                        {!isLowStock && !isSoldOut && item.stock <= 20 && (
                            <span className="inline-block text-[11px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                                剩餘 {item.stock} 份
                            </span>
                        )}
                    </div>

                    {/* 右側數量控制 */}
                    <div className="flex-shrink-0">
                        {quantity === 0 ? (
                            <button
                                onClick={onAdd}
                                disabled={isSoldOut}
                                className={`w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-2xl flex items-center justify-center transition-all active:scale-90 ${isSoldOut
                                    ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-200 hover:shadow-xl hover:scale-105'
                                    }`}
                            >
                                <Plus className="w-6 h-6 lg:w-7 lg:h-7" strokeWidth={2.5} />
                            </button>
                        ) : (
                            <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3">
                                <button
                                    onClick={onRemove}
                                    className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-all active:scale-90"
                                >
                                    <Minus className="w-5 h-5 lg:w-6 lg:h-6" />
                                </button>

                                <div className="w-10 sm:w-12 lg:w-14 text-center">
                                    <span className="text-2xl lg:text-3xl font-black text-orange-500">{quantity}</span>
                                </div>

                                <button
                                    onClick={onAdd}
                                    disabled={isMaxReached}
                                    className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl flex items-center justify-center transition-all active:scale-90 ${isMaxReached
                                        ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md hover:shadow-lg'
                                        }`}
                                >
                                    <Plus className="w-5 h-5 lg:w-6 lg:h-6" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* 已選取指示條 */}
                {quantity > 0 && (
                    <div className="absolute left-0 top-3 bottom-3 w-1 bg-gradient-to-b from-orange-400 to-red-400 rounded-r-full" />
                )}
            </div>

            {/* 圖片 Lightbox Modal */}
            {showLightbox && item.imageUrl && createPortal(
                <div
                    className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 animate-fadeIn"
                    onClick={() => setShowLightbox(false)}
                >
                    {/* 關閉按鈕 */}
                    <button
                        className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-full bg-black/30 hover:bg-black/50 transition"
                        onClick={() => setShowLightbox(false)}
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {/* 圖片容器 */}
                    <div
                        className="relative max-w-lg w-full bg-white rounded-2xl overflow-hidden shadow-2xl animate-scaleIn"
                        onClick={e => e.stopPropagation()}
                    >
                        <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full max-h-[60vh] object-contain bg-gray-100"
                        />
                        <div className="p-4 bg-white">
                            <h3 className="text-xl font-bold text-gray-800">{item.name}</h3>
                            <div className="flex items-baseline gap-1 mt-1">
                                <span className="text-orange-500 text-sm">$</span>
                                <span className="text-2xl font-black text-orange-500">{item.price}</span>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}

export default MenuCard;

