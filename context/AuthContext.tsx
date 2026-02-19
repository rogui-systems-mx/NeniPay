import { ConfirmationResult, EmailAuthProvider, GoogleAuthProvider, onAuthStateChanged, reauthenticateWithCredential, signInAnonymously, signInWithCredential, signInWithPhoneNumber, signOut, updateEmail, updatePassword, updateProfile, User } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, isFirebaseConfigured } from '../utils/firebase';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isConfigured: boolean;
    logout: () => Promise<void>;
    updateProfileInfo: (displayName: string, businessName?: string, phone?: string) => Promise<void>;
    updateEmailInfo: (email: string) => Promise<void>;
    updatePasswordInfo: (password: string) => Promise<void>;
    verifyPassword: (password: string) => Promise<boolean>;
    signInWithGoogle: (idToken: string) => Promise<void>;
    sendPhoneCode: (phoneNumber: string) => Promise<ConfirmationResult>;
    sendWhatsAppCode: (phoneNumber: string) => Promise<string>;
    verifyWhatsAppCode: (code: string, phoneNumber: string) => Promise<boolean>;
    checkPhoneConflict: (phoneNumber: string) => Promise<boolean>;
    userPhone: string | null;
    businessName: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [userPhone, setUserPhone] = useState<string | null>(null);
    const [businessName, setBusinessName] = useState<string | null>(null);
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);
    const isConfigured = isFirebaseConfigured();

    useEffect(() => {
        console.log('[AuthContext] Initializing auth...');
        if (!isConfigured) {
            console.warn('[AuthContext] Firebase not configured');
            setLoading(false);
            return;
        }

        // Safety timeout for auth loading
        const timeoutId = setTimeout(() => {
            if (loading) {
                console.warn('[AuthContext] Auth loading timed out (5s), forcing completion');
                setLoading(false);
            }
        }, 5000);

        const unsubscribe = onAuthStateChanged(auth, async (authenticatedUser) => {
            console.log('[AuthContext] Auth state changed:', authenticatedUser ? 'User found' : 'No user');
            try {
                setUser(authenticatedUser);
                if (authenticatedUser) {
                    // Fetch phone from Firestore
                    const userDoc = await getDoc(doc(db, 'users', authenticatedUser.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        setUserPhone(data.phone || null);
                        setBusinessName(data.businessName || null);
                    }
                }
            } catch (e) {
                console.error('Error during auth state change processing:', e);
            } finally {
                setLoading(false);
                clearTimeout(timeoutId);
            }
        }, (error) => {
            console.error('onAuthStateChanged error:', error);
            setLoading(false);
            clearTimeout(timeoutId);
        });

        return () => {
            unsubscribe();
            clearTimeout(timeoutId);
        };
    }, [isConfigured]);

    const logout = async () => {
        try {
            await signOut(auth);
            setUserPhone(null);
            setBusinessName(null);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const updateProfileInfo = async (displayName: string, businessName?: string, phone?: string) => {
        if (!user) return;
        try {
            await updateProfile(user, { displayName });

            const updates: any = {};
            if (phone !== undefined) updates.phone = phone;
            if (businessName !== undefined) updates.businessName = businessName;

            if (Object.keys(updates).length > 0) {
                await setDoc(doc(db, 'users', user.uid), updates, { merge: true });
                if (phone !== undefined) setUserPhone(phone);
                if (businessName !== undefined) setBusinessName(businessName);
            }

            // Trigger UI refresh
            setUser({ ...user, displayName });
        } catch (error) {
            throw error;
        }
    };

    const updateEmailInfo = async (email: string) => {
        if (!user) return;
        try {
            await updateEmail(user, email);
            setUser({ ...user, email });
        } catch (error) {
            throw error;
        }
    };

    const updatePasswordInfo = async (password: string) => {
        if (!user) return;
        try {
            await updatePassword(user, password);
        } catch (error) {
            throw error;
        }
    };

    const verifyPassword = async (password: string): Promise<boolean> => {
        if (!user || !user.email) return false;
        try {
            const credential = EmailAuthProvider.credential(user.email, password);
            await reauthenticateWithCredential(user, credential);
            return true;
        } catch (error) {
            console.error('Password verification failed:', error);
            return false;
        }
    };

    const signInWithGoogle = async (idToken: string) => {
        const credential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(auth, credential);
    };


    const sendPhoneCode = async (phoneNumber: string) => {
        return await signInWithPhoneNumber(auth, phoneNumber);
    };

    const sendWhatsAppCode = async (phoneNumber: string): Promise<string> => {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        console.log(`[AuthContext] Generated code for ${phoneNumber}: ${code}`);
        setGeneratedCode(code);
        return code;
    };

    const verifyWhatsAppCode = async (code: string, phoneNumber: string): Promise<boolean> => {
        const trimmedCode = code.trim();
        console.log(`[AuthContext] Verifying code: ${trimmedCode} (expected: ${generatedCode})`);

        if (trimmedCode === generatedCode) {
            try {
                setGeneratedCode(null);

                // 1. Sign in anonymously to create a real Firebase session
                console.log('[AuthContext] Signing in anonymously...');
                const userCredential = await signInAnonymously(auth);
                const newUser = userCredential.user;

                // 2. Link phone in Firestore (users collection)
                console.log(`[AuthContext] Linking phone ${phoneNumber} to user ${newUser.uid}`);
                await setDoc(doc(db, 'users', newUser.uid), {
                    phone: phoneNumber,
                    lastLogin: new Date().toISOString(),
                    provider: 'whatsapp'
                }, { merge: true });

                // 3. Update local state
                setUserPhone(phoneNumber);

                return true;
            } catch (error) {
                console.error('[AuthContext] Error in verifyWhatsAppCode:', error);
                throw error;
            }
        }
        return false;
    };

    const checkPhoneConflict = async (phoneNumber: string): Promise<boolean> => {
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('phone', '==', phoneNumber));
            const querySnapshot = await getDocs(q);
            return !querySnapshot.empty;
        } catch (error) {
            console.error('Error checking phone conflict:', error);
            return false;
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            isConfigured,
            logout,
            updateProfileInfo,
            updateEmailInfo,
            updatePasswordInfo,
            verifyPassword,
            signInWithGoogle,
            sendPhoneCode,
            sendWhatsAppCode,
            verifyWhatsAppCode,
            checkPhoneConflict,
            userPhone,
            businessName
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
