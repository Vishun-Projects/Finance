import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  lastLogin: string;
  createdAt: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      console.log('🔐 AUTH HOOK - Checking authentication...');
      try {
        setLoading(true);
        setError(null);
        console.log('🔐 AUTH HOOK - Making request to /api/auth/me...');
        const response = await fetch('/api/app', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'auth_me' }),
        });
        console.log('🔐 AUTH HOOK - Response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ AUTH HOOK - User authenticated:', JSON.stringify(data.user, null, 2));
          setUser(data.user);
        } else if (response.status === 401) {
          console.log('🔐 AUTH HOOK - User not authenticated (401)');
          setUser(null); // User is not authenticated - this is normal
        } else {
          console.log('❌ AUTH HOOK - Unexpected response status:', response.status);
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (err) {
        console.error('❌ AUTH HOOK - Error checking auth:', err);
        setError(err instanceof Error ? err.message : 'Authentication check failed');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  return { user, loading, error };
}
