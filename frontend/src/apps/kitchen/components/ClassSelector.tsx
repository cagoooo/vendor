import { useState } from 'react';
import { Store, ChevronDown } from 'lucide-react';
import type { Kitchen } from '../../../services/classApi';

export interface ClassSelectorProps {
    kitchens: Kitchen[];
    currentClassId: string | null;
    onSelect: (classId: string) => void;
}

/**
 * 班級選擇器下拉組件
 * 用於 Owner 在不同班級間切換管理
 */
export function ClassSelector({ kitchens, currentClassId, onSelect }: ClassSelectorProps) {
    const [showDropdown, setShowDropdown] = useState(false);

    const currentKitchen = kitchens.find(k => k.classId === currentClassId);

    return (
        <div className="relative">
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-pink-500 text-white px-2.5 py-1.5 md:px-3 md:py-2 rounded-lg font-bold text-xs md:text-sm shadow-lg"
            >
                <Store className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="max-w-[60px] md:max-w-none truncate">
                    {currentKitchen?.className || '選擇'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 md:w-4 md:h-4 transition ${showDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showDropdown && (
                <>
                    {/* 點擊外部關閉 */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowDropdown(false)}
                    />
                    <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 min-w-[160px] md:min-w-[180px] py-1">
                        {kitchens.map(k => (
                            <button
                                key={k.classId}
                                onClick={() => {
                                    onSelect(k.classId);
                                    setShowDropdown(false);
                                }}
                                className={`w-full px-3 md:px-4 py-2 text-left text-xs md:text-sm hover:bg-gray-700 flex items-center justify-between ${k.classId === currentClassId ? 'text-orange-400 font-bold' : 'text-gray-300'
                                    }`}
                            >
                                <span>{k.className}</span>
                                {k.isOpen ? (
                                    <span className="text-[10px] bg-green-600 px-1.5 rounded text-white">營業</span>
                                ) : (
                                    <span className="text-[10px] bg-gray-600 px-1.5 rounded text-gray-300">休息</span>
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
