'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
import Navigation from './layout/Navigation';

interface AuthWrapperProps {
  children: React.ReactNode;
}

// Routes that don't require authentication
const publicRoutes = ['/login', '/register'];

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!loading && !user && !publicRoutes.includes(pathname)) {
      router.push('/login');
    }
  }, [user, loading, pathname, router]);

  // Don't render anything on server side
  if (!isClient) {
    return null;
  }

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // For public routes, render without navigation
  if (publicRoutes.includes(pathname)) {
    return <>{children}</>;
  }

  // For protected routes, render with navigation if authenticated
  if (user) {
    return (
      <>
        <Navigation />
        <main className="content-wrapper">
          {children}
        </main>
      </>
    );
  }

  // Don't render anything if not authenticated (will redirect)
  return null;
}
