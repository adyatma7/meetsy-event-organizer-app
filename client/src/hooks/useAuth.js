/**
 * useAuth — Admin JWT authentication hook
 *
 * Provides: login, logout, isAuthenticated, admin info
 */

import { useState, useEffect, useCallback } from 'react';
import { setToken, getToken, removeToken, decodeToken, isTokenExpired } from '../lib/auth';
import api from '../lib/api';

export function useAuth() {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check existing token on mount
  useEffect(() => {
    const token = getToken();
    if (token && !isTokenExpired(token)) {
      const decoded = decodeToken(token);
      if (decoded?.role === 'admin') {
        setAdmin(decoded);
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api.post('/public/auth/login', { email, password });
    setToken(data.token);
    const decoded = decodeToken(data.token);
    setAdmin(decoded);
    return decoded;
  }, []);

  const logout = useCallback(() => {
    removeToken();
    setAdmin(null);
  }, []);

  return {
    admin,
    isAuthenticated: !!admin,
    loading,
    login,
    logout,
  };
}
