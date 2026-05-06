import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { loginUser, logoutUser, refreshSession, registerUser } from '../api/auth';
import { getAccessToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refreshSession()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: Boolean(user && getAccessToken()),
    async login(input) {
      const nextUser = await loginUser(input);
      setUser(nextUser);
      return nextUser;
    },
    async register(input) {
      const nextUser = await registerUser(input);
      setUser(nextUser);
      return nextUser;
    },
    async refresh() {
      const nextUser = await refreshSession();
      setUser(nextUser);
      return nextUser;
    },
    async logout() {
      await logoutUser();
      setUser(null);
    }
  }), [loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
}
