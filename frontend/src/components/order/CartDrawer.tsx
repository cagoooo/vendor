import { X } from 'lucide-react';

interface CartDrawerProps {
    onClose: () => void;
    onSubmit?: () => void;
}

export function CartDrawer({ onClose }: CartDrawerProps) {
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
            <div className="bg-white w-full rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">購物車</h2>
                    <button onClick={onClose} className="p-2">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="text-center text-gray-400 py-8">
                    購物車功能整合於底部列
                </div>
            </div>
        </div>
    );
}

export default CartDrawer;
