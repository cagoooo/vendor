import { useState, useCallback, useRef } from 'react';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../services/firebase';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';

interface ImageUploadProps {
    currentImageUrl?: string;
    onUploadComplete: (url: string) => void;
    onDelete?: () => void;
    folder?: string;
    maxSizeKB?: number;
}

export function ImageUpload({
    currentImageUrl,
    onUploadComplete,
    onDelete,
    folder = 'menu-images',
    maxSizeKB = 500
}: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // 壓縮圖片
    const compressImage = (file: File): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new window.Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const maxSize = 800;
                    let { width, height } = img;

                    if (width > height && width > maxSize) {
                        height = (height * maxSize) / width;
                        width = maxSize;
                    } else if (height > maxSize) {
                        width = (width * maxSize) / height;
                        height = maxSize;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);

                    canvas.toBlob(
                        (blob) => {
                            if (blob) resolve(blob);
                            else reject(new Error('壓縮失敗'));
                        },
                        'image/jpeg',
                        0.8
                    );
                };
                img.onerror = reject;
                img.src = e.target?.result as string;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    // 上傳檔案
    const uploadFile = async (file: File) => {
        setError(null);
        setUploading(true);
        setProgress(0);

        try {
            // 檢查檔案類型
            if (!file.type.startsWith('image/')) {
                throw new Error('請選擇圖片檔案');
            }

            // 壓縮圖片
            const compressed = await compressImage(file);

            // 檢查大小
            if (compressed.size > maxSizeKB * 1024) {
                throw new Error(`圖片過大，請選擇小於 ${maxSizeKB}KB 的圖片`);
            }

            // 建立唯一檔名
            const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
            const storageRef = ref(storage, filename);

            // 上傳
            const uploadTask = uploadBytesResumable(storageRef, compressed);

            uploadTask.on(
                'state_changed',
                (snapshot) => {
                    const pct = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setProgress(pct);
                },
                (err) => {
                    setError(err.message);
                    setUploading(false);
                },
                async () => {
                    const url = await getDownloadURL(uploadTask.snapshot.ref);
                    setPreview(url);
                    onUploadComplete(url);
                    setUploading(false);
                }
            );
        } catch (err) {
            setError((err as Error).message);
            setUploading(false);
        }
    };

    // 處理檔案選擇
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) uploadFile(file);
    };

    // 處理拖放
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) uploadFile(file);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragging(false);
    }, []);

    // 刪除圖片
    const handleDelete = async () => {
        if (!preview) return;

        try {
            // 如果是 Firebase Storage URL，嘗試刪除
            if (preview.includes('firebasestorage.googleapis.com')) {
                const imageRef = ref(storage, preview);
                await deleteObject(imageRef).catch(() => { });
            }
            setPreview(null);
            onDelete?.();
        } catch (err) {
            console.error('Delete error:', err);
        }
    };

    return (
        <div className="space-y-2">
            {preview ? (
                // 預覽模式
                <div className="relative group">
                    <img
                        src={preview}
                        alt="Preview"
                        className="w-full h-40 object-cover rounded-xl border-2 border-gray-200"
                    />
                    <button
                        onClick={handleDelete}
                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition shadow-lg"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                // 上傳區域
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => inputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${isDragging
                            ? 'border-orange-400 bg-orange-50'
                            : 'border-gray-300 hover:border-orange-300 hover:bg-gray-50'
                        }`}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                    />

                    {uploading ? (
                        <div className="space-y-2">
                            <Loader2 className="w-8 h-8 mx-auto text-orange-500 animate-spin" />
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-orange-500 h-2 rounded-full transition-all"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="text-sm text-gray-500">{Math.round(progress)}%</p>
                        </div>
                    ) : (
                        <>
                            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-orange-100 flex items-center justify-center">
                                {isDragging ? (
                                    <ImageIcon className="w-6 h-6 text-orange-500" />
                                ) : (
                                    <Upload className="w-6 h-6 text-orange-500" />
                                )}
                            </div>
                            <p className="text-sm text-gray-600 font-medium">
                                {isDragging ? '放開以上傳' : '點擊或拖曳圖片'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                建議 800x600 以內，自動壓縮
                            </p>
                        </>
                    )}
                </div>
            )}

            {error && (
                <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">
                    {error}
                </p>
            )}
        </div>
    );
}

export default ImageUpload;
