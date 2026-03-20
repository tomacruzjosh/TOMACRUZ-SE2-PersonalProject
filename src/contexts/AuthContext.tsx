import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

const ADMIN_EMAILS = ['tomacruzj415@gmail.com', 'jcesperanza@neu.edu.ph'];

export interface AppUser {
  uid: string;
  email: string;
  fullName: string;
  role: 'admin' | 'user';
  college_office?: string;
  isSetupComplete: boolean;
  isBlocked: boolean;
  createdAt: any;
}

interface AuthContextType {
  user: FirebaseUser | null;
  appUser: AppUser | null;
  loading: boolean;
  refreshAppUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  appUser: null,
  loading: true,
  refreshAppUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAppUser = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        setAppUser(userDoc.data() as AppUser);
      } else {
        setAppUser(null);
      }
    } catch (error) {
      console.error('Error fetching app user:', error);
    }
  };

  const refreshAppUser = async () => {
    if (user) {
      await fetchAppUser(user.uid);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Check if user exists in Firestore, if not, create a basic profile
        const userRef = doc(db, 'users', firebaseUser.uid);
        try {
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            const role = ADMIN_EMAILS.includes(firebaseUser.email || '') ? 'admin' : 'user';
            const newUser: AppUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              fullName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Unknown User',
              role: role,
              isSetupComplete: false,
              isBlocked: false,
              createdAt: serverTimestamp(),
            };
            await setDoc(userRef, newUser);
            setAppUser(newUser);
          } else {
            const userData = userSnap.data() as AppUser;
            // Self-heal: If the user is in the ADMIN_EMAILS list but their role is 'user', upgrade them.
            if (ADMIN_EMAILS.includes(firebaseUser.email || '') && userData.role !== 'admin') {
              await updateDoc(userRef, { role: 'admin' });
              userData.role = 'admin';
            }
            setAppUser(userData);
          }
        } catch (error) {
          console.error('Error checking/creating user:', error);
        }
      } else {
        setAppUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, appUser, loading, refreshAppUser }}>
      {children}
    </AuthContext.Provider>
  );
}
