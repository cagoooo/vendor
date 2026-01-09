import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
    signInWithPopup,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    type User
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

export type UserRole = 'owner' | 'classAdmin' | 'staff' | 'pending' | 'none';
export type UserStatus = 'pending' | 'approved' | 'rejected';

interface UserProfile {
    uid: string;
    email: string;
    name: string;
    role: UserRole;
    classId?: string;        // 班級 ID (例如: 'class-3-2')
    className?: string;      // 班級名稱 (例如: '3年2班')
    status?: UserStatus;     // 審核狀態
    photoURL?: string;
    approvedAt?: Date;
    approvedBy?: string;
}

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    error: string | null;
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    requestClassAdmin: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    isOwner: boolean;
    isStaff: boolean;
    isClassAdmin: boolean;
    isPending: boolean;
    isAuthenticated: boolean;
    currentClassId: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 監聽登入狀態
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);

            if (firebaseUser) {
                // 從 Firestore 取得用戶資料
                const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

                if (userDoc.exists()) {
                    const data = userDoc.data();
                    setProfile({
                        uid: firebaseUser.uid,
                        email: firebaseUser.email || '',
                        name: data.name || firebaseUser.displayName || '',
                        role: data.role || 'none',
                        classId: data.classId || undefined,
                        className: data.className || undefined,
                        status: data.status || undefined,
                        photoURL: data.photoURL || firebaseUser.photoURL || undefined,
                        approvedAt: data.approvedAt?.toDate() || undefined,
                        approvedBy: data.approvedBy || undefined,
                    });
                } else {
                    // 新用戶，建立資料 (預設無權限)
                    const newProfile: UserProfile = {
                        uid: firebaseUser.uid,
                        email: firebaseUser.email || '',
                        name: firebaseUser.displayName || '',
                        role: 'none',
                        photoURL: firebaseUser.photoURL || undefined,
                    };

                    await setDoc(doc(db, 'users', firebaseUser.uid), {
                        ...newProfile,
                        createdAt: serverTimestamp(),
                    });

                    setProfile(newProfile);
                }
            } else {
                setProfile(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        try {
            setError(null);
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (err) {
            setError((err as Error).message);
            throw err;
        }
    };

    const signInWithEmail = async (email: string, password: string) => {
        try {
            setError(null);
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            setError((err as Error).message);
            throw err;
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            setProfile(null);
        } catch (err) {
            setError((err as Error).message);
        }
    };

    const isOwner = profile?.role === 'owner';
    const isStaff = profile?.role === 'staff' || profile?.role === 'owner';
    const isClassAdmin = profile?.role === 'classAdmin';
    const isPending = profile?.role === 'pending';
    const isAuthenticated = !!user && !!profile && (profile.role === 'owner' || profile.role === 'staff' || profile.role === 'classAdmin');
    // owner 如果沒有設定 classId，使用預設值 'default'
    const currentClassId = profile?.classId || (profile?.role === 'owner' ? 'default' : null);

    // 申請成為班級管理員
    const requestClassAdmin = async () => {
        if (!user) return;
        try {
            await updateDoc(doc(db, 'users', user.uid), {
                role: 'pending',
                status: 'pending',
                updatedAt: serverTimestamp(),
            });
            setProfile(prev => prev ? { ...prev, role: 'pending', status: 'pending' } : null);
        } catch (err) {
            setError((err as Error).message);
        }
    };

    // 刷新用戶資料
    const refreshProfile = async () => {
        if (!user) return;
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
            const data = userDoc.data();
            setProfile({
                uid: user.uid,
                email: user.email || '',
                name: data.name || user.displayName || '',
                role: data.role || 'none',
                classId: data.classId || undefined,
                className: data.className || undefined,
                status: data.status || undefined,
                photoURL: data.photoURL || user.photoURL || undefined,
                approvedAt: data.approvedAt?.toDate() || undefined,
                approvedBy: data.approvedBy || undefined,
            });
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            profile,
            loading,
            error,
            signInWithGoogle,
            signInWithEmail,
            logout,
            requestClassAdmin,
            refreshProfile,
            isOwner,
            isStaff,
            isClassAdmin,
            isPending,
            isAuthenticated,
            currentClassId,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
