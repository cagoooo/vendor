import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, ChefHat, Clock, UserPlus } from 'lucide-react';

export function LoginPage() {
    const { signInWithGoogle, loading, error, profile, logout, requestClassAdmin, isPending, refreshProfile } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleGoogleLogin = async () => {
        setIsSubmitting(true);
        try {
            await signInWithGoogle();
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRequestAccess = async () => {
        setIsSubmitting(true);
        try {
            await requestClassAdmin();
        } finally {
            setIsSubmitting(false);
        }
    };

    // 待審核狀態
    if (isPending || (profile && profile.role === 'pending')) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
                <div className="bg-gray-800 rounded-3xl shadow-2xl p-8 max-w-md w-full text-center border border-gray-700">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
                        <Clock className="w-10 h-10 text-yellow-400" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-3">等待審核中</h2>
                    <p className="text-gray-400 mb-2">
                        帳號 <span className="text-orange-400 font-medium">{profile?.email}</span>
                    </p>
                    <p className="text-gray-500 mb-6 text-sm">
                        您的申請已送出，請等待管理員審核。<br />
                        審核通過後，您將被指派負責的班級廚房。
                    </p>
                    <button
                        onClick={async () => {
                            await refreshProfile();
                        }}
                        className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-xl transition mb-3 flex items-center justify-center gap-2"
                    >
                        <Loader2 className="w-5 h-5" />
                        重新檢查狀態
                    </button>
                    <button
                        onClick={logout}
                        className="text-gray-500 hover:text-white text-sm transition"
                    >
                        使用其他帳號登入
                    </button>
                </div>
            </div>
        );
    }

    // 已登入但無權限
    if (profile && profile.role === 'none') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
                <div className="bg-gray-800 rounded-3xl shadow-2xl p-8 max-w-md w-full text-center border border-gray-700">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-orange-500/20 flex items-center justify-center">
                        <UserPlus className="w-10 h-10 text-orange-400" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-3">歡迎使用</h2>
                    <p className="text-gray-400 mb-2">
                        帳號 <span className="text-orange-400 font-medium">{profile.email}</span>
                    </p>
                    <p className="text-gray-500 mb-6 text-sm">
                        您尚未被授權進入廚房管理系統。<br />
                        請申請成為班級管理員，待管理員審核通過後即可使用。
                    </p>
                    <button
                        onClick={handleRequestAccess}
                        disabled={isSubmitting}
                        className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-3 rounded-xl transition mb-3 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <UserPlus className="w-5 h-5" />
                                申請成為班級管理員
                            </>
                        )}
                    </button>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-xl transition mb-3"
                    >
                        返回點餐頁面
                    </button>
                    <button
                        onClick={logout}
                        className="text-gray-500 hover:text-white text-sm transition"
                    >
                        使用其他帳號登入
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-3xl shadow-2xl p-8 max-w-md w-full border border-gray-700">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                        <ChefHat className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-2xl font-black text-white">廚房管理系統</h1>
                    <p className="text-gray-500 mt-1">登入以管理訂單與庫存</p>
                </div>

                {error && (
                    <div className="bg-red-500/20 border border-red-500/50 text-red-300 rounded-xl px-4 py-3 mb-6 text-sm">
                        {error}
                    </div>
                )}

                {/* Google Login */}
                <button
                    onClick={handleGoogleLogin}
                    disabled={isSubmitting || loading}
                    className="w-full bg-white hover:bg-gray-100 text-gray-800 font-bold py-3.5 rounded-xl flex items-center justify-center gap-3 transition shadow-lg disabled:opacity-50"
                >
                    {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            使用 Google 登入
                        </>
                    )}
                </button>

                {/* Back to Order Button */}
                <div className="mt-6">
                    <Link
                        to="/"
                        className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-xl transition border border-gray-600 shadow-lg"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span className="text-sm md:text-base">返回點餐頁面</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
