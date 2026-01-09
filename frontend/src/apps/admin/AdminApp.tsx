import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    updateDoc,
    setDoc,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import {
    Users, CheckCircle2, XCircle, School, Clock,
    LogOut, Settings, RefreshCw, ChefHat, AlertCircle
} from 'lucide-react';
import Swal from 'sweetalert2';

interface PendingUser {
    uid: string;
    email: string;
    name: string;
    photoURL?: string;
    createdAt?: Date;
}

interface Kitchen {
    classId: string;
    className: string;
    ownerUid: string;
    ownerName: string;
    createdAt?: Date;
}

export function AdminApp() {
    const { profile, logout, isOwner } = useAuth();
    const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
    const [kitchens, setKitchens] = useState<Kitchen[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'pending' | 'kitchens'>('pending');

    // 載入待審核用戶
    const loadPendingUsers = async () => {
        try {
            const q = query(
                collection(db, 'users'),
                where('role', '==', 'pending')
            );
            const snapshot = await getDocs(q);
            const users: PendingUser[] = snapshot.docs.map(doc => ({
                uid: doc.id,
                email: doc.data().email,
                name: doc.data().name,
                photoURL: doc.data().photoURL,
                createdAt: doc.data().createdAt?.toDate(),
            }));
            setPendingUsers(users);
        } catch (error) {
            console.error('Load pending users error:', error);
        }
    };

    // 載入所有班級廚房
    const loadKitchens = async () => {
        try {
            const snapshot = await getDocs(collection(db, 'kitchens'));
            const kitchenList: Kitchen[] = snapshot.docs.map(doc => ({
                classId: doc.id,
                className: doc.data().className,
                ownerUid: doc.data().ownerUid,
                ownerName: doc.data().ownerName || '',
                createdAt: doc.data().createdAt?.toDate(),
            }));
            setKitchens(kitchenList);
        } catch (error) {
            console.error('Load kitchens error:', error);
        }
    };

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await Promise.all([loadPendingUsers(), loadKitchens()]);
            setLoading(false);
        };
        load();
    }, []);

    // 審核通過用戶
    const handleApprove = async (user: PendingUser) => {
        const { value: classInfo } = await Swal.fire({
            title: '指派班級',
            html: `
                <p class="text-gray-400 mb-4">為 <span class="text-orange-400 font-bold">${user.name || user.email}</span> 指派負責的班級</p>
                <div class="flex gap-4 justify-center items-center">
                    <select id="grade" style="background-color: #374151; color: white; border: 1px solid #4b5563; border-radius: 8px; padding: 8px 16px; font-size: 14px; cursor: pointer;">
                        <option value="1">1年級</option>
                        <option value="2">2年級</option>
                        <option value="3">3年級</option>
                        <option value="4">4年級</option>
                        <option value="5">5年級</option>
                        <option value="6">6年級</option>
                    </select>
                    <select id="classNum" style="background-color: #374151; color: white; border: 1px solid #4b5563; border-radius: 8px; padding: 8px 16px; font-size: 14px; cursor: pointer;">
                        <option value="1">1班</option>
                        <option value="2">2班</option>
                        <option value="3">3班</option>
                        <option value="4">4班</option>
                        <option value="5">5班</option>
                        <option value="6">6班</option>
                        <option value="7">7班</option>
                        <option value="8">8班</option>
                        <option value="9">9班</option>
                        <option value="10">10班</option>
                    </select>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: '確認指派',
            cancelButtonText: '取消',
            confirmButtonColor: '#10b981',
            background: '#1f2937',
            color: '#fff',
            preConfirm: () => {
                const grade = (document.getElementById('grade') as HTMLSelectElement).value;
                const classNum = (document.getElementById('classNum') as HTMLSelectElement).value;
                return { grade, classNum };
            }
        });

        if (!classInfo) return;

        const classId = `class-${classInfo.grade}-${classInfo.classNum}`;
        const className = `${classInfo.grade}年${classInfo.classNum}班`;

        try {
            // 更新用戶角色
            await updateDoc(doc(db, 'users', user.uid), {
                role: 'classAdmin',
                status: 'approved',
                classId,
                className,
                approvedAt: serverTimestamp(),
                approvedBy: profile?.uid,
            });

            // 確保班級廚房存在
            await setDoc(doc(db, 'kitchens', classId), {
                classId,
                className,
                ownerUid: user.uid,
                ownerName: user.name || user.email,
                createdAt: serverTimestamp(),
            }, { merge: true });

            // 為新班級建立預設系統設定
            await setDoc(doc(db, `kitchens/${classId}/system`, 'config'), {
                isOpen: true,
                waitTime: 15,
                createdAt: serverTimestamp(),
            }, { merge: true });

            Swal.fire({
                icon: 'success',
                title: '審核成功',
                text: `${user.name || user.email} 已被指派為 ${className} 的管理員`,
                background: '#1f2937',
                color: '#fff',
            });

            // 重新載入
            await Promise.all([loadPendingUsers(), loadKitchens()]);
        } catch (error) {
            console.error('Approve user error:', error);
            Swal.fire({
                icon: 'error',
                title: '審核失敗',
                text: (error as Error).message,
                background: '#1f2937',
                color: '#fff',
            });
        }
    };

    // 拒絕用戶
    const handleReject = async (user: PendingUser) => {
        const result = await Swal.fire({
            title: '確定拒絕？',
            text: `${user.name || user.email} 的申請將被拒絕`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: '確定拒絕',
            cancelButtonText: '取消',
            confirmButtonColor: '#ef4444',
            background: '#1f2937',
            color: '#fff',
        });

        if (!result.isConfirmed) return;

        try {
            await updateDoc(doc(db, 'users', user.uid), {
                role: 'none',
                status: 'rejected',
                updatedAt: serverTimestamp(),
            });

            Swal.fire({
                icon: 'success',
                title: '已拒絕',
                background: '#1f2937',
                color: '#fff',
            });

            await loadPendingUsers();
        } catch (error) {
            console.error('Reject user error:', error);
        }
    };

    if (!isOwner) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                <div className="bg-gray-800 rounded-3xl shadow-2xl p-8 max-w-md w-full text-center border border-gray-700">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                        <AlertCircle className="w-10 h-10 text-red-400" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-3">權限不足</h2>
                    <p className="text-gray-400 mb-6">只有管理員可以存取此頁面</p>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-xl transition"
                    >
                        返回首頁
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100">
            {/* Header */}
            <header className="bg-gray-800 border-b border-gray-700 p-4 shadow-lg sticky top-0 z-20">
                <div className="flex flex-wrap justify-between items-center gap-4 max-w-7xl mx-auto">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl md:text-2xl font-black text-purple-400 tracking-wider flex items-center gap-2">
                            <Settings className="w-6 h-6" />
                            管理中心
                        </h1>
                    </div>

                    {/* Tabs */}
                    <div className="flex bg-gray-700 rounded-lg p-1 gap-1">
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 transition ${activeTab === 'pending' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            <Users className="w-4 h-4" />
                            待審核
                            {pendingUsers.length > 0 && (
                                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                                    {pendingUsers.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('kitchens')}
                            className={`px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 transition ${activeTab === 'kitchens' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            <School className="w-4 h-4" />
                            班級廚房
                        </button>
                    </div>

                    {/* User Info */}
                    <div className="flex items-center gap-3">
                        {profile && (
                            <div className="hidden sm:flex items-center gap-2 bg-gray-700 rounded-lg px-3 py-1.5">
                                {profile.photoURL ? (
                                    <img src={profile.photoURL} alt="" className="w-6 h-6 rounded-full" />
                                ) : (
                                    <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-xs font-bold text-white">
                                        {profile.name?.charAt(0) || 'A'}
                                    </div>
                                )}
                                <span className="text-sm text-gray-300">{profile.name}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-purple-500 text-white">
                                    管理員
                                </span>
                            </div>
                        )}

                        {/* 返回廚房按鈕 - 橘色漸層帶文字 */}
                        <Link
                            to="/kitchen"
                            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-4 py-2 rounded-lg transition flex items-center gap-2 font-bold text-sm shadow-lg shadow-orange-500/20"
                        >
                            <ChefHat className="w-4 h-4" />
                            <span className="hidden sm:inline">廚房後台</span>
                        </Link>

                        {/* 登出按鈕 - 文字連結風格 */}
                        <button
                            onClick={logout}
                            className="text-gray-400 hover:text-red-400 px-2 py-2 transition flex items-center gap-1 text-sm"
                            title="登出"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline">登出</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="p-4 md:p-6 max-w-7xl mx-auto">
                {loading ? (
                    <div className="text-center py-20">
                        <RefreshCw className="w-12 h-12 mx-auto mb-4 text-gray-500 animate-spin" />
                        <p className="text-gray-500">載入中...</p>
                    </div>
                ) : (
                    <>
                        {/* Pending Users Tab */}
                        {activeTab === 'pending' && (
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-lg font-bold text-gray-300 flex items-center gap-2">
                                        <Clock className="w-5 h-5" />
                                        待審核申請
                                        <span className="bg-purple-600 text-white px-2 py-0.5 rounded-full text-sm">
                                            {pendingUsers.length}
                                        </span>
                                    </h2>
                                    <button
                                        onClick={loadPendingUsers}
                                        className="text-gray-400 hover:text-white text-sm bg-gray-800 px-4 py-2 rounded-lg border border-gray-700 flex items-center gap-1"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        重整
                                    </button>
                                </div>

                                {pendingUsers.length === 0 ? (
                                    <div className="text-center py-20 text-gray-600">
                                        <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                        <p>目前沒有待審核的申請</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {pendingUsers.map(user => (
                                            <div
                                                key={user.uid}
                                                className="bg-gray-800 rounded-xl p-4 border border-gray-700 shadow-lg"
                                            >
                                                <div className="flex items-start gap-3 mb-4">
                                                    {user.photoURL ? (
                                                        <img src={user.photoURL} alt="" className="w-12 h-12 rounded-full" />
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-xl font-bold text-gray-400">
                                                            {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-bold text-white truncate">{user.name || '未設定名稱'}</h3>
                                                        <p className="text-sm text-gray-400 truncate">{user.email}</p>
                                                        {user.createdAt && (
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                申請時間: {user.createdAt.toLocaleDateString('zh-TW')}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleApprove(user)}
                                                        className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-1 transition"
                                                    >
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        通過
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(user)}
                                                        className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-1 transition"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                        拒絕
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Kitchens Tab */}
                        {activeTab === 'kitchens' && (
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-lg font-bold text-gray-300 flex items-center gap-2">
                                        <School className="w-5 h-5" />
                                        班級廚房
                                        <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-sm">
                                            {kitchens.length}
                                        </span>
                                    </h2>
                                    <button
                                        onClick={loadKitchens}
                                        className="text-gray-400 hover:text-white text-sm bg-gray-800 px-4 py-2 rounded-lg border border-gray-700 flex items-center gap-1"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        重整
                                    </button>
                                </div>

                                {kitchens.length === 0 ? (
                                    <div className="text-center py-20 text-gray-600">
                                        <School className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                        <p>尚未有任何班級廚房</p>
                                        <p className="text-sm mt-2">審核通過員工後會自動建立</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {kitchens.map(kitchen => (
                                            <div
                                                key={kitchen.classId}
                                                className="bg-gray-800 rounded-xl p-4 border border-gray-700 shadow-lg hover:border-blue-500/50 transition"
                                            >
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center">
                                                        <ChefHat className="w-6 h-6 text-blue-400" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-white text-lg">{kitchen.className}</h3>
                                                        <p className="text-xs text-gray-500 font-mono">{kitchen.classId}</p>
                                                    </div>
                                                </div>
                                                <div className="text-sm text-gray-400">
                                                    <p>負責人: <span className="text-gray-300">{kitchen.ownerName}</span></p>
                                                    {kitchen.createdAt && (
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            建立於: {kitchen.createdAt.toLocaleDateString('zh-TW')}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}

export default AdminApp;
