'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  lastLogin: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    const startTime = Date.now();
    try {
      console.log('🔐 AUTH CONTEXT - Starting auth check...');
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/auth/me');
      console.log('🔐 AUTH CONTEXT - /api/auth/me response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔐 AUTH CONTEXT - User data received:', JSON.stringify(data, null, 2));
        setUser(data.user);
        console.log('🔐 AUTH CONTEXT - User state set to:', data.user);
        console.log(`⏱️ AUTH CONTEXT - checkAuth complete in ${Date.now() - startTime}ms`);
      } else if (response.status === 401) {
        console.log('🔐 AUTH CONTEXT - 401 Unauthorized, setting user to null');
        setUser(null);
      } else {
        console.log('🔐 AUTH CONTEXT - Other error status:', response.status);
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      console.error('🔐 AUTH CONTEXT - Auth check failed:', err);
      setError(err instanceof Error ? err.message : 'Authentication check failed');
      setUser(null);
    } finally {
      setLoading(false);
      console.log('🔐 AUTH CONTEXT - Auth check completed, loading set to false');
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const startTime = Date.now();
    try {
      console.log('🔐 AUTH CONTEXT - Starting login...');
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      console.log('🔐 AUTH CONTEXT - Login response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔐 AUTH CONTEXT - Login successful, user data:', JSON.stringify(data, null, 2));
        setUser(data.user);
        console.log('🔐 AUTH CONTEXT - User state set to:', data.user);
        console.log(`⏱️ AUTH CONTEXT - login complete in ${Date.now() - startTime}ms`);
        return true;
      } else {
        const errorData = await response.json();
        console.log('🔐 AUTH CONTEXT - Login failed:', errorData);
        setError(errorData.error || 'Login failed');
        return false;
      }
    } catch (err) {
      console.error('🔐 AUTH CONTEXT - Login error:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
      return false;
    } finally {
      setLoading(false);
      console.log('🔐 AUTH CONTEXT - Login completed, loading set to false');
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  }, []);

  const refreshUser = useCallback(async (): Promise<void> => {
    await checkAuth();
  }, [checkAuth]);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    user,
    loading,
    error,
    login,
    logout,
    refreshUser,
  }), [user, loading, error, login, logout, refreshUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
