/**
 * useStaffSession — Staff PIN authentication hook
 *
 * Provides: login with PIN, session info, logout
 * Staff session is event-scoped and stored in sessionStorage only.
 */

import { useState, useEffect, useCallback } from 'react';
import { setToken, getToken, removeToken, decodeToken, isTokenExpired } from '../lib/auth';
import api from '../lib/api';

export function useStaffSession() {
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check existing staff session on mount
  useEffect(() => {
    const token = getToken();
    if (token && !isTokenExpired(token)) {
      const decoded = decodeToken(token);
      if (decoded?.role === 'staff') {
        setStaff(decoded);
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (slug, pin) => {
    const data = await api.post('/staff/auth', { slug, pin });
    setToken(data.token);
    const decoded = decodeToken(data.token);
    setStaff({
      ...decoded,
      eventTitle: data.eventTitle,
    });
    return data;
  }, []);

  const logout = useCallback(() => {
    removeToken();
    setStaff(null);
  }, []);

  return {
    staff,
    isAuthenticated: !!staff,
    loading,
    login,
    logout,
  };
}
