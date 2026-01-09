import { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Share2, Check, MessageCircle, Facebook, Link2, Download, QrCode } from 'lucide-react';

interface ShareModalProps {
    shareUrl: string;
    title?: string;
    onClose: () => void;
}

export function ShareModal({ shareUrl, title = '校園點餐系統', onClose }: ShareModalProps) {
    const [copied, setCopied] = useState(false);
    const qrRef = useRef<HTMLDivElement>(null);

    // 複製連結
    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for older browsers
            const input = document.createElement('input');
            input.value = shareUrl;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // 分享到 LINE
    const shareToLine = () => {
        const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`;
        window.open(lineUrl, '_blank', 'width=600,height=600');
    };

    // 分享到 Facebook
    const shareToFacebook = () => {
        const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(title)}`;
        window.open(fbUrl, '_blank', 'width=600,height=600');
    };

    // 使用 Web Share API（如果可用）
    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: title,
                    text: '快來這裡點餐！',
                    url: shareUrl,
                });
            } catch {
                // User cancelled or error
            }
        }
    };

    // 下載 QR Code
    const downloadQRCode = () => {
        if (!qrRef.current) return;
        const svg = qrRef.current.querySelector('svg');
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            canvas.width = img.width * 2;
            canvas.height = img.height * 2;
            if (ctx) {
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                const a = document.createElement('a');
                a.download = 'order-qrcode.png';
                a.href = canvas.toDataURL('image/png');
                a.click();
            }
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
            onClick={onClose}
        >
            <div
                className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-slideUp"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4 flex justify-between items-center">
                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                        <QrCode className="w-6 h-6" />
                        分享點餐連結
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* QR Code */}
                <div className="p-6">
                    <div
                        ref={qrRef}
                        className="bg-white p-6 rounded-2xl border-4 border-gray-100 shadow-inner mx-auto w-fit"
                    >
                        <QRCodeSVG
                            value={shareUrl}
                            size={180}
                            level="H"
                            includeMargin={false}
                            bgColor="#ffffff"
                            fgColor="#1f2937"
                        />
                    </div>
                    <p className="text-center text-gray-500 text-sm mt-4">
                        📱 掃描 QR Code 快速進入點餐系統
                    </p>
                </div>

                {/* Share Buttons */}
                <div className="px-6 pb-6 space-y-3">
                    {/* 主要分享按鈕 - 2列佈局 */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={shareToLine}
                            className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-[#06C755] hover:bg-[#05b54d] text-white transition active:scale-95"
                        >
                            <MessageCircle className="w-6 h-6" />
                            <span className="font-bold">LINE</span>
                        </button>
                        <button
                            onClick={shareToFacebook}
                            className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-[#1877F2] hover:bg-[#166fe5] text-white transition active:scale-95"
                        >
                            <Facebook className="w-6 h-6" />
                            <span className="font-bold">Facebook</span>
                        </button>
                        <button
                            onClick={downloadQRCode}
                            className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white transition active:scale-95"
                        >
                            <Download className="w-6 h-6" />
                            <span className="font-bold">下載 QR</span>
                        </button>
                        {/* 只在移動設備上顯示更多分享 */}
                        {/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? (
                            <button
                                onClick={handleNativeShare}
                                className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-gray-800 hover:bg-gray-700 text-white transition active:scale-95"
                            >
                                <Share2 className="w-6 h-6" />
                                <span className="font-bold">更多</span>
                            </button>
                        ) : (
                            <button
                                onClick={handleCopyLink}
                                className={`flex items-center justify-center gap-2 p-4 rounded-2xl transition active:scale-95 ${copied
                                        ? 'bg-green-500 text-white'
                                        : 'bg-gray-800 hover:bg-gray-700 text-white'
                                    }`}
                            >
                                {copied ? <Check className="w-6 h-6" /> : <Link2 className="w-6 h-6" />}
                                <span className="font-bold">{copied ? '已複製' : '複製'}</span>
                            </button>
                        )}
                    </div>

                    {/* 複製連結 */}
                    <button
                        onClick={handleCopyLink}
                        className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition active:scale-95 ${copied
                            ? 'bg-green-100 text-green-700 border-2 border-green-200'
                            : 'bg-gray-100 text-gray-700 border-2 border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                            }`}
                    >
                        {copied ? (
                            <>
                                <Check className="w-5 h-5" />
                                已複製連結！
                            </>
                        ) : (
                            <>
                                <Link2 className="w-5 h-5" />
                                複製點餐連結
                            </>
                        )}
                    </button>

                    {/* 連結預覽 */}
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <p className="text-xs text-gray-400 break-all font-mono">{shareUrl}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ShareModal;
