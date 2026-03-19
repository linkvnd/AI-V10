import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, addDoc, collection, serverTimestamp, query, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { auth, db, googleProvider, facebookProvider } from '../firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL: string;
  role: 'admin' | 'user';
  isPro: boolean;
  premiumLevel: number;
  provider: string;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (provider: 'google' | 'facebook') => Promise<void>;
  logout: () => Promise<void>;
  upgradeToLevel: (uid: string, level: number) => Promise<void>;
  requestPremium: (paymentCode: string, level: number) => Promise<void>;
  clearChatHistory: () => Promise<void>;
  updateProfile: (data: { name?: string; photoURL?: string }) => Promise<void>;
  error: string | null;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  language: 'vi' | 'en';
  setLanguage: (lang: 'vi' | 'en') => void;
  notifications: boolean;
  setNotifications: (val: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAIL = "globalmmok24@gmail.com";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });
  const [language, setLanguageState] = useState<'vi' | 'en'>(() => {
    return (localStorage.getItem('language') as 'vi' | 'en') || 'vi';
  });
  const [notifications, setNotificationsState] = useState<boolean>(() => {
    return localStorage.getItem('notifications') !== 'false';
  });

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const setLanguage = (lang: 'vi' | 'en') => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const setNotifications = (val: boolean) => {
    setNotificationsState(val);
    localStorage.setItem('notifications', String(val));
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        
        // Simple device ID check
        let deviceId = localStorage.getItem('deviceId');
        if (!deviceId) {
          deviceId = Math.random().toString(36).substring(2, 15);
          localStorage.setItem('deviceId', deviceId);
        }

        const unsubProfile = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            
            // Auto-upgrade to admin if email matches but role is still 'user'
            if (data.email === ADMIN_EMAIL && data.role !== 'admin') {
              updateDoc(userRef, { role: 'admin' }).catch(err => 
                console.error("Failed to auto-upgrade admin role:", err)
              );
            }
            
            setUser(data);
          } else {
            const newUser: UserProfile = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || 'User',
              email: firebaseUser.email || '',
              photoURL: firebaseUser.photoURL || '',
              role: firebaseUser.email === ADMIN_EMAIL ? 'admin' : 'user',
              isPro: false,
              premiumLevel: 0,
              provider: firebaseUser.providerData[0]?.providerId || 'unknown'
            };
            setDoc(userRef, newUser).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}`));
            setUser(newUser);
          }
          setLoading(false);
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
          setLoading(false);
        });

        return () => unsubProfile();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (provider: 'google' | 'facebook') => {
    try {
      setError(null);
      const authProvider = provider === 'google' ? googleProvider : facebookProvider;
      await signInWithPopup(auth, authProvider);
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Đăng nhập thất bại");
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const upgradeToLevel = async (uid: string, level: number) => {
    try {
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, { isPro: level > 0, premiumLevel: level }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const requestPremium = async (paymentCode: string, level: number) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'premium_requests'), {
        uid: user.uid,
        email: user.email,
        name: user.name,
        paymentCode,
        level,
        status: 'pending',
        createdAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'premium_requests');
    }
  };

  const clearChatHistory = async () => {
    if (!user) return;
    try {
      const sessionsRef = collection(db, 'chats', user.uid, 'sessions');
      const snapshot = await getDocs(sessionsRef);
      
      const deletePromises = snapshot.docs.map(async (sessionDoc) => {
        // Delete messages subcollection first
        const messagesRef = collection(db, 'chats', user.uid, 'sessions', sessionDoc.id, 'messages');
        const messagesSnapshot = await getDocs(messagesRef);
        const messageDeletes = messagesSnapshot.docs.map(m => deleteDoc(m.ref));
        await Promise.all(messageDeletes);
        
        // Then delete the session itself
        return deleteDoc(sessionDoc.ref);
      });
      
      await Promise.all(deletePromises);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `chats/${user.uid}/sessions`);
    }
  };

  const updateProfile = async (data: { name?: string; photoURL?: string }) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, data);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      logout, 
      upgradeToLevel, 
      requestPremium, 
      clearChatHistory, 
      updateProfile,
      error, 
      theme, 
      toggleTheme,
      language,
      setLanguage,
      notifications,
      setNotifications
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
