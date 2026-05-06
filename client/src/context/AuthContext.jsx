import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth';
import { setAccessToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    authApi.refreshSession()
      .then((data) => {
        setAccessToken(data.accessToken);
        setUser(data.user);
        setStatus('authenticated');
      })
      .catch(() => {
        setAccessToken(null);
        setUser(null);
        setStatus('guest');
      });
  }, []);

  async function signIn(payload) {
    const data = await authApi.login(payload);
    setAccessToken(data.accessToken);
    setUser(data.user);
    setStatus('authenticated');
    return data.user;
  }

  async function signUp(payload) {
    const data = await authApi.register(payload);
    setAccessToken(data.accessToken);
    setUser(data.user);
    setStatus('authenticated');
    return data.user;
  }

  async function refreshFromCookie() {
    const data = await authApi.refreshSession();
    setAccessToken(data.accessToken);
    setUser(data.user);
    setStatus('authenticated');
    return data.user;
  }

  async function signOut() {
    await authApi.logout().catch(() => null);
    setAccessToken(null);
    setUser(null);
    setStatus('guest');
  }

  const value = useMemo(() => ({
    isAuthenticated: status === 'authenticated',
    refreshFromCookie,
    signIn,
    signOut,
    signUp,
    status,
    user,
  }), [status, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
