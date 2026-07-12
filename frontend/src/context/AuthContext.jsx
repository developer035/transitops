import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { syncUser } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // Firebase user object
  const [role, setRole] = useState(null);        // role from backend: fleet_manager | driver | safety_officer | financial_analyst
  const [userInfo, setUserInfo] = useState(null); // full backend user doc
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          // Call /auth/sync to get/create the user's role in backend
          const res = await syncUser();
          setRole(res.data.role);
          setUserInfo(res.data);
        } catch (err) {
          console.error('Failed to sync user with backend:', err);
          setRole(null);
          setUserInfo(null);
        }
      } else {
        setUser(null);
        setRole(null);
        setUserInfo(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential;
  };

  const logout = async () => {
    await signOut(auth);
  };

  const value = {
    user,
    role,
    userInfo,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
