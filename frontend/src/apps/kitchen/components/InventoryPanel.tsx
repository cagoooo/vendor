import { useState } from 'react';
import { RefreshCw, Plus, Minus, Tag, ImagePlus, X, Upload } from 'lucide-react';
import { LowStockAlert } from '../../../components/LowStockAlert';
import {
    updateClassStock,
    addClassMenuItem,
    updateClassMenuItem,
    uploadMenuItemImage,
    deleteMenuItemImage,
    updateClassCategories,
} from '../../../services/classApi';
import type { CategoryItem } from '../../../types';
import Swal from 'sweetalert2';

interface MenuItem {
    id: string;
    name: string;
    price: number;
    stock: number;
    category: string;
    imageUrl?: string;
    isActive: boolean;
}

interface InventoryPanelProps {
    menuItems: MenuItem[];
    categories: CategoryItem[];
    currentClassId: string | null;
    onRefresh: () => void;
    onCategoriesUpdate: (categories: CategoryItem[]) => void;
}

export function InventoryPanel({
    menuItems,
    categories,
    currentClassId,
    onRefresh,
    onCategoriesUpdate,
}: InventoryPanelProps) {
    const [, setLocalCategories] = useState(categories);

    // 管理分類
    const handleManageCategories = async () => {
        const emojiOptions = ['🍔', '🍛', '🍜', '🍝', '🍕', '🍟', '🌮', '🌯', '🥤', '☕', '🧋', '🍹', '🍰', '🍩', '🍪', '🧁', '🍦', '🍨', '🥗', '🥪', '🍱', '🍙', '🍘', '🍢', '🥟', '🍗', '🍖', '🥩', '🌭', '🥓'];

        const buildCategoryHtml = (cats: CategoryItem[], selectedEmoji = '🍔') => `
            <div class="text-left max-h-40 overflow-y-auto mb-4">
                ${cats.map((c) => `
                    <div class="flex items-center justify-between bg-gray-700 rounded-lg p-3 mb-2">
                        <span class="text-base">${c.icon} ${c.name}</span>
                        <button class="cat-del text-red-400 hover:text-red-300 text-sm px-3 py-1" data-id="${c.id}">刪除</button>
                    </div>
                `).join('')}
            </div>
            <div class="border-t border-gray-600 pt-4">
                <p class="text-sm text-gray-400 mb-2">新增分類</p>
                <input type="hidden" id="cat-icon" value="${selectedEmoji}">
                <div class="grid grid-cols-6 gap-1 mb-3 max-h-24 overflow-y-auto p-1 bg-gray-800 rounded-lg">
                    ${emojiOptions.map(e => `
                        <button type="button" class="emoji-btn text-xl p-2 rounded hover:bg-gray-600 transition ${e === selectedEmoji ? 'bg-orange-500' : 'bg-gray-700'}" data-emoji="${e}">${e}</button>
                    `).join('')}
                </div>
                <input id="cat-name" class="w-full h-10 px-3 rounded-lg border border-gray-600 bg-gray-700 text-white" placeholder="分類名稱">
            </div>
        `;

        let currentCats = [...categories];

        if (currentClassId && currentCats.length > 0 && currentCats[0].id === 'main') {
            await updateClassCategories(currentClassId, currentCats);
        }

        const bindEvents = () => {
            document.querySelectorAll('.emoji-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const emoji = (e.target as HTMLElement).dataset.emoji;
                    if (emoji) {
                        (document.getElementById('cat-icon') as HTMLInputElement).value = emoji;
                        document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('bg-orange-500'));
                        (e.target as HTMLElement).classList.add('bg-orange-500');
                    }
                });
            });

            document.querySelectorAll('.cat-del').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = (e.target as HTMLElement).dataset.id;
                    currentCats = currentCats.filter(c => c.id !== id);
                    if (currentClassId) {
                        await updateClassCategories(currentClassId, currentCats);
                        setLocalCategories(currentCats);
                        onCategoriesUpdate(currentCats);
                        Swal.update({ html: buildCategoryHtml(currentCats) });
                        bindEvents();
                    }
                });
            });
        };

        const result = await Swal.fire({
            title: '管理分類',
            html: buildCategoryHtml(currentCats),
            showCancelButton: true,
            confirmButtonText: '新增分類',
            cancelButtonText: '關閉',
            confirmButtonColor: '#10b981',
            background: '#1f2937',
            color: '#fff',
            didOpen: bindEvents,
            preConfirm: () => {
                const icon = (document.getElementById('cat-icon') as HTMLInputElement)?.value || '📦';
                const name = (document.getElementById('cat-name') as HTMLInputElement)?.value;
                if (!name) {
                    Swal.showValidationMessage('請輸入分類名稱');
                    return false;
                }
                return { icon, name };
            }
        });

        if (result.isConfirmed && result.value && currentClassId) {
            const newCat: CategoryItem = {
                id: `cat-${Date.now()}`,
                name: result.value.name,
                icon: result.value.icon,
                order: currentCats.length + 1
            };
            const updatedCats = [...currentCats, newCat];
            await updateClassCategories(currentClassId, updatedCats);
            onCategoriesUpdate(updatedCats);
            Swal.fire({
                title: '已新增分類',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
                background: '#1f2937',
                color: '#fff'
            });
        }
    };

    // 新增品項
    const handleAddItem = async () => {
        const categoryOptions = categories.map(c =>
            `<option value="${c.id}">${c.icon} ${c.name}</option>`
        ).join('');

        const { value } = await Swal.fire({
            title: '新增品項',
            html: `
                <input id="s-n" class="swal2-input" placeholder="品名">
                <input id="s-p" type="number" class="swal2-input" placeholder="價格">
                <input id="s-s" type="number" class="swal2-input" placeholder="庫存">
                <select id="s-c" class="swal2-input">
                    ${categoryOptions}
                </select>
            `,
            focusConfirm: false,
            background: '#1f2937',
            color: '#fff',
            preConfirm: () => ({
                name: (document.getElementById('s-n') as HTMLInputElement).value,
                price: (document.getElementById('s-p') as HTMLInputElement).value,
                stock: (document.getElementById('s-s') as HTMLInputElement).value,
                category: (document.getElementById('s-c') as HTMLSelectElement).value,
            }),
        });

        if (value?.name && value?.price && currentClassId) {
            await addClassMenuItem(currentClassId, value.name, parseInt(value.price), parseInt(value.stock) || 0, value.category || 'main');
            onRefresh();
        }
    };

    // 更換分類
    const handleChangeCategory = async (item: MenuItem) => {
        const categoryOptions = categories.map(c =>
            `<option value="${c.id}" ${item.category === c.id ? 'selected' : ''}>${c.icon} ${c.name}</option>`
        ).join('');

        const { value } = await Swal.fire({
            title: '選擇分類',
            html: `<select id="cat-select" class="swal2-input" style="background-color: #374151; color: #fff; border-color: #4b5563;">${categoryOptions}</select>`,
            showCancelButton: true,
            confirmButtonText: '確認',
            cancelButtonText: '取消',
            background: '#1f2937',
            color: '#fff',
            preConfirm: () => (document.getElementById('cat-select') as HTMLSelectElement).value
        });

        if (value && currentClassId && value !== item.category) {
            await updateClassMenuItem(currentClassId, item.id, { category: value });
            onRefresh();
        }
    };

    // 上傳圖片
    const handleUploadImage = async (itemId: string, file: File) => {
        if (!currentClassId) return;
        Swal.fire({ title: '上傳中...', allowOutsideClick: false, didOpen: () => Swal.showLoading(), background: '#1f2937', color: '#fff' });
        await uploadMenuItemImage(currentClassId, itemId, file);
        Swal.close();
        onRefresh();
    };

    // 刪除圖片
    const handleDeleteImage = async (itemId: string, imageUrl: string) => {
        const result = await Swal.fire({
            title: '移除圖片？',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonText: '取消',
            confirmButtonText: '移除',
            background: '#1f2937',
            color: '#fff',
        });
        if (result.isConfirmed && currentClassId) {
            await deleteMenuItemImage(currentClassId, itemId, imageUrl);
            onRefresh();
        }
    };

    // 庫存調整
    const handleStockChange = async (itemId: string, newStock: number) => {
        if (!currentClassId) return;
        await updateClassStock(currentClassId, itemId, Math.max(0, newStock));
        onRefresh();
    };

    return (
        <div className="max-w-4xl mx-auto">
            {/* 庫存低量警示 */}
            <LowStockAlert items={menuItems} threshold={5} />

            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-300">庫存與菜單</h2>
                <div className="flex gap-2">
                    <button
                        onClick={handleManageCategories}
                        className="bg-purple-600 hover:bg-purple-500 text-white text-sm px-4 py-2 rounded-lg font-bold shadow flex items-center gap-1"
                    >
                        <Tag className="w-4 h-4" />
                        分類
                    </button>
                    <button
                        onClick={handleAddItem}
                        className="bg-green-600 hover:bg-green-500 text-white text-sm px-4 py-2 rounded-lg font-bold shadow flex items-center gap-1"
                    >
                        <Plus className="w-4 h-4" />
                        新增
                    </button>
                    <button
                        onClick={onRefresh}
                        className="text-gray-400 hover:text-white text-sm bg-gray-800 px-4 py-2 rounded-lg border border-gray-700"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-lg overflow-hidden">
                <table className="w-full text-left text-gray-300">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                        <tr>
                            <th className="px-3 py-3 w-16">圖片</th>
                            <th className="px-4 py-3">品項 (價格)</th>
                            <th className="px-2 py-3 text-center">分類</th>
                            <th className="px-2 py-3 text-center">目前庫存</th>
                            <th className="px-4 py-3 text-center">快速調整</th>
                        </tr>
                    </thead>
                    <tbody>
                        {menuItems.map(item => (
                            <tr key={item.id} className="border-b border-gray-700 hover:bg-gray-700/50 transition">
                                {/* 圖片欄 */}
                                <td className="px-3 py-2">
                                    <div className="relative group">
                                        {item.imageUrl ? (
                                            <div className="relative">
                                                <img
                                                    src={item.imageUrl}
                                                    alt={item.name}
                                                    className="w-12 h-12 object-cover rounded-lg border border-gray-600"
                                                />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
                                                    <label className="cursor-pointer p-1 bg-blue-600 rounded hover:bg-blue-500 transition">
                                                        <Upload className="w-3 h-3 text-white" />
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) handleUploadImage(item.id, file);
                                                            }}
                                                        />
                                                    </label>
                                                    <button
                                                        onClick={() => handleDeleteImage(item.id, item.imageUrl!)}
                                                        className="p-1 bg-red-600 rounded hover:bg-red-500 transition"
                                                    >
                                                        <X className="w-3 h-3 text-white" />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <label className="w-12 h-12 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center cursor-pointer hover:border-orange-500 hover:bg-gray-700/50 transition">
                                                <ImagePlus className="w-5 h-5 text-gray-500" />
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) handleUploadImage(item.id, file);
                                                    }}
                                                />
                                            </label>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3 font-bold text-gray-200">
                                    <span>{item.name}</span>
                                    <span className="text-xs text-gray-500 ml-2">(${item.price})</span>
                                </td>
                                <td className="px-2 py-3 text-center">
                                    <button
                                        onClick={() => handleChangeCategory(item)}
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs transition"
                                        title="點擊更改分類"
                                    >
                                        {categories.find(c => c.id === item.category)?.icon || '📦'}
                                        <span className="text-gray-300">
                                            {categories.find(c => c.id === item.category)?.name || item.category}
                                        </span>
                                    </button>
                                </td>
                                <td className="px-2 py-3 text-center">
                                    <input
                                        type="number"
                                        value={item.stock}
                                        onChange={(e) => handleStockChange(item.id, parseInt(e.target.value) || 0)}
                                        className={`bg-transparent border-b-2 border-gray-600 text-center w-16 font-bold text-lg focus:outline-none focus:border-orange-500 ${item.stock <= 5 ? 'text-red-500' : 'text-green-400'
                                            }`}
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex justify-center gap-2">
                                        <button
                                            onClick={() => handleStockChange(item.id, item.stock - 1)}
                                            className="bg-gray-700 hover:bg-gray-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleStockChange(item.id, item.stock + 1)}
                                            className="bg-gray-700 hover:bg-gray-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleStockChange(item.id, item.stock + 10)}
                                            className="bg-gray-700 hover:bg-gray-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow text-xs"
                                        >
                                            +10
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
