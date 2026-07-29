'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback, useRef } from 'react';
import { clearRouteBootstrap } from '@/hooks/use-route-bootstrap';

export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  phone?: string;
  dateOfBirth?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  occupation?: string;
  bio?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt?: string;
  role?: 'USER' | 'SUPERUSER';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  initialUser?: User | null;
}

export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  const hasInitialSnapshot = typeof initialUser !== 'undefined';
  const [user, setUser] = useState<User | null>(hasInitialSnapshot ? initialUser ?? null : null);
  const [loading, setLoading] = useState(!hasInitialSnapshot);
  const [error, setError] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    const startTime = Date.now();
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auth_me' }),
      });

      if (response.ok) {
        const text = await response.text();
        try {
          const data = JSON.parse(text);
          setUser(data.user);
        } catch (e) {
          console.error('🔐 AUTH CONTEXT - Failed to parse auth_me JSON:', text.substring(0, 100));
          throw new Error('Server returned invalid data format');
        }
      } else if (response.status === 401) {
        setUser(null);
      } else if (response.status === 403) {
        console.error('[auth] CSRF or origin blocked auth_me — session kept');
        setError('Session verification blocked. Refresh the page.');
      } else {
        const text = await response.text();
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // Use default HTTP error message if not JSON
        }
        throw new Error(errorMessage);
      }
    } catch (err) {
      console.error('🔐 AUTH CONTEXT - Auth check failed:', err);
      setError(err instanceof Error ? err.message : 'Authentication check failed');
      if (!(err instanceof Error && err.message.includes('403'))) {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasInitialSnapshot) {
      setUser(initialUser ?? null);
      setLoading(false);
      return;
    }
    checkAuth();
  }, [hasInitialSnapshot, initialUser, checkAuth]);

  const login = useCallback(async (email: string, password: string): Promise<User | null> => {
    const startTime = Date.now();
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auth_login', email, password }),
      });


      if (response.ok) {
        const text = await response.text();
        try {
          const data = JSON.parse(text);
          setUser(data.user);
          return data.user;
        } catch (e) {
          console.error('🔐 AUTH CONTEXT - Failed to parse login JSON:', text.substring(0, 100));
          throw new Error('Server returned invalid data format');
        }
      } else {
        const text = await response.text();
        let errorMessage = 'Login failed';
        let requiresVerification = false;
        let verificationEmail: string | undefined;
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.error || errorData.message || errorMessage;
          requiresVerification = Boolean(errorData.requiresVerification);
          verificationEmail = errorData.email;
        } catch (e) {
          errorMessage = `Login failed (HTTP ${response.status})`;
        }
        if (requiresVerification) {
          const err = new Error(errorMessage || 'Verification required');
          (err as Error & { requiresVerification?: boolean; email?: string }).requiresVerification = true;
          (err as Error & { requiresVerification?: boolean; email?: string }).email = verificationEmail;
          throw err;
        }
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err) {
      console.error('🔐 AUTH CONTEXT - Login error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Login failed';
      setError(errorMsg);
      // Re-throw so the component's try/catch can handle specific flows (like OTP redirect)
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const prevUserIdRef = useRef<string | null>(hasInitialSnapshot ? initialUser?.id ?? null : null);

  useEffect(() => {
    const nextId = user?.id ?? null;
    if (prevUserIdRef.current !== null && prevUserIdRef.current !== nextId) {
      clearRouteBootstrap();
    }
    prevUserIdRef.current = nextId;
  }, [user?.id]);

  const logout = useCallback(async (): Promise<void> => {
    clearRouteBootstrap();
    setUser(null);
    document.documentElement.classList.remove('dark');
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('theme');
      } catch {
        // ignore
      }
    }
    // Full navigation so Set-Cookie from logout response is applied before auth page loads
    window.location.href = '/api/auth/logout';
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
