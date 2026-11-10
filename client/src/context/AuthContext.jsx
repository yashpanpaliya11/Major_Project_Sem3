import { createContext, useState, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../api/axios';
import toast from 'react-hot-toast';

export const AuthContext = createContext(null);

function readStoredUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveUser(user) {
  if (user) localStorage.setItem('user', JSON.stringify(user));
  else localStorage.removeItem('user');
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('token')));

  const clearSession = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  const validateToken = useCallback(async () => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      setLoading(false);
      return;
    }

    try {
      const decoded = jwtDecode(storedToken);
      if (!decoded?.exp || decoded.exp * 1000 <= Date.now()) {
        clearSession();
        setLoading(false);
        return;
      }
    } catch {
      clearSession();
      setLoading(false);
      return;
    }

    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
      saveUser(res.data.user);
      setToken(storedToken);
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        clearSession();
      } else {
        // Transient network failure: keep the cached profile so the user is
        // not logged out while the API restarts.
        setUser(readStoredUser());
        setToken(storedToken);
      }
    } finally {
      setLoading(false);
    }
  }, [clearSession]);

  useEffect(() => {
    validateToken();
  }, [validateToken]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, user: newUser } = res.data;

    localStorage.setItem('token', newToken);
    saveUser(newUser);
    setToken(newToken);
    setUser(newUser);
    toast.success(`Welcome back, ${newUser.name}!`);
    return newUser;
  };

  const register = async (data) => {
    const res = await api.post('/auth/register', data);
    const { token: newToken, user: newUser } = res.data;

    localStorage.setItem('token', newToken);
    saveUser(newUser);
    setToken(newToken);
    setUser(newUser);
    toast.success('Account created successfully!');
    return newUser;
  };

  const logout = () => {
    clearSession();
    toast.success('Logged out');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
