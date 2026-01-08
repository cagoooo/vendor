import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
    signInWithPopup,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    type User
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

export type UserRole = 'owner' | 'staff' | 'none';

interface UserProfile {
    uid: string;
    email: string;
    name: string;
    role: UserRole;
    photoURL?: string;
}

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    error: string | null;
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    isOwner: boolean;
    isStaff: boolean;
    isAuthenticated: boolean;
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
                        photoURL: data.photoURL || firebaseUser.photoURL || undefined,
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
    const isAuthenticated = !!user && !!profile && profile.role !== 'none';

    return (
        <AuthContext.Provider value={{
            user,
            profile,
            loading,
            error,
            signInWithGoogle,
            signInWithEmail,
            logout,
            isOwner,
            isStaff,
            isAuthenticated,
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
