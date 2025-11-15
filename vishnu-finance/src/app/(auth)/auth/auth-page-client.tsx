'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, LogIn, UserPlus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLoading } from '@/contexts/LoadingContext';

type AuthTab = 'login' | 'register';

interface AuthPageClientProps {
  initialTab: AuthTab;
}

function AuthPageInner({ initialTab }: AuthPageClientProps) {
  const searchParams = useSearchParams();
  const derivedTab = useMemo<AuthTab>(() => {
    const tabParam = searchParams.get('tab');
    return tabParam === 'register' ? 'register' : 'login';
  }, [searchParams]);

  const [activeTab, setActiveTab] = useState<AuthTab>(initialTab);

  useEffect(() => {
    setActiveTab(derivedTab);
  }, [derivedTab]);

  // Force light theme on auth page
  useEffect(() => {
    document.documentElement.classList.remove('dark', 'high-contrast');
    document.documentElement.classList.add('light');
  }, []);

  // Login state
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Register state
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [logoSrc, setLogoSrc] = useState('/icon-removebg-preview.png');
  
  // OAuth provider availability
  const [oauthProviders, setOauthProviders] = useState({
    google: true, // Assume Google is always available (existing)
    microsoft: false,
    apple: false,
  });

  const router = useRouter();
  const { login } = useAuth();
  const { setLoading } = useLoading();

  // Check OAuth provider availability on mount
  useEffect(() => {
    const checkOAuthProviders = async () => {
      try {
        const response = await fetch('/api/auth/oauth/config');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.providers) {
            setOauthProviders(data.providers);
          }
        }
      } catch (error) {
        console.error('Failed to check OAuth providers:', error);
        // Keep defaults (Google enabled, others disabled)
      }
    };
    checkOAuthProviders();
  }, []);

  // Login handlers
  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginData(prev => ({ ...prev, [name]: value }));
    setLoginError('');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const startTime = Date.now();
    setIsLoggingIn(true);
    setLoginError('');
    setLoading(true, 'Signing you in...');

    try {
      const authenticatedUser = await login(loginData.email, loginData.password);

      if (authenticatedUser) {
        console.log(`⏱️ AUTH PAGE - Login flow complete in ${Date.now() - startTime}ms, redirecting...`);
        const destination = authenticatedUser.role === 'SUPERUSER' ? '/admin' : '/dashboard';
        router.push(destination);
      } else {
        setLoginError('Invalid email or password');
      }
    } catch (error) {
      console.error('[auth] login failed', error);
      setLoginError('Network error. Please try again.');
    } finally {
      setIsLoggingIn(false);
      setLoading(false);
    }
  };

  // Register handlers
  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRegisterData(prev => ({ ...prev, [name]: value }));
    setRegisterError('');
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);
    setRegisterError('');
    setLoading(true, 'Creating your account...');

    // Validate passwords match
    if (registerData.password !== registerData.confirmPassword) {
      setRegisterError('Passwords do not match');
      setIsRegistering(false);
      setLoading(false);
      return;
    }

    // Validate password length
    if (registerData.password.length < 6) {
      setRegisterError('Password must be at least 6 characters long');
      setIsRegistering(false);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: registerData.name,
          email: registerData.email,
          password: registerData.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Auto-login after registration
        const loginUser = await login(registerData.email, registerData.password);
        if (loginUser) {
          const destination = loginUser.role === 'SUPERUSER' ? '/admin' : '/dashboard';
          router.push(destination);
        } else {
          router.push('/');
        }
      } else {
        setRegisterError(data.error || 'Registration failed');
      }
    } catch (error) {
      console.error('[auth] registration failed', error);
      setRegisterError('Network error. Please try again.');
    } finally {
      setIsRegistering(false);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28">
              <Image
                src={logoSrc}
                alt="Vishnu Finance Logo"
                fill
                className="object-contain"
                priority
                sizes="(max-width: 640px) 5rem, (max-width: 768px) 6rem, 7rem"
                onError={() => {
                  if (!logoSrc.includes('android-chrome')) {
                    console.error('Failed to load logo image:', logoSrc);
                    setLogoSrc('/android-chrome-512x512.png');
                  }
                }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
              Vishnu Finance
            </h1>
            <p className="text-sm text-slate-600 font-medium">Secure Personal Finance Management</p>
          </div>
        </div>

        {/* Auth Card */}
        <Card className="shadow-lg border border-slate-200/60 bg-white">
          <CardContent className="p-6 sm:p-8">
            <Tabs value={activeTab} onValueChange={value => setActiveTab(value as AuthTab)} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-100/80 h-11 rounded-lg p-1">
                <TabsTrigger
                  value="login"
                  className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-600 font-medium text-sm transition-all duration-200 rounded-md"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-600 font-medium text-sm transition-all duration-200 rounded-md"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create Account
                </TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent value="login" className="space-y-6 mt-0">
                <div className="space-y-1 text-center">
                  <h2 className="text-xl font-semibold text-slate-900">Welcome back</h2>
                  <p className="text-sm text-slate-600">
                    Sign in to continue managing your finances with Vishnu Finance.
                  </p>
                </div>

                {loginError && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50/80 px-3 py-2 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{loginError}</span>
                  </div>
                )}

                {/* OAuth Provider Buttons */}
                <div className="space-y-3">
                  {/* Google Sign In Button */}
                  {oauthProviders.google && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-11 border-slate-200 bg-white hover:bg-slate-50 transition-all duration-200"
                      onClick={() => {
                        window.location.href = '/api/auth/oauth/google';
                      }}
                    >
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Sign in with Google
                    </Button>
                  )}

                  {/* Microsoft Sign In Button */}
                  {oauthProviders.microsoft && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-11 border-slate-200 bg-white hover:bg-slate-50 transition-all duration-200"
                      onClick={() => {
                        window.location.href = '/api/auth/oauth/microsoft';
                      }}
                    >
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 23 23" fill="none">
                        <path d="M0 0H11V11H0V0Z" fill="#F25022" />
                        <path d="M12 0H23V11H12V0Z" fill="#7FBA00" />
                        <path d="M0 12H11V23H0V12Z" fill="#00A4EF" />
                        <path d="M12 12H23V23H12V12Z" fill="#FFB900" />
                      </svg>
                      Sign in with Microsoft
                    </Button>
                  )}

                  {/* Apple Sign In Button */}
                  {oauthProviders.apple && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-11 border-slate-200 bg-white hover:bg-slate-50 transition-all duration-200"
                      onClick={() => {
                        window.location.href = '/api/auth/oauth/apple';
                      }}
                    >
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                      </svg>
                      Sign in with Apple
                    </Button>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-slate-500">Or continue with</span>
                  </div>
                </div>

                <form className="space-y-5" onSubmit={handleLoginSubmit}>
                  <div className="space-y-1.5">
                    <Label htmlFor="login-email" className="text-sm font-medium text-slate-700">
                      Email address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="login-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        placeholder="you@example.com"
                        className="pl-9 h-11 border-slate-200 bg-slate-50/60 focus:bg-white"
                        value={loginData.email}
                        onChange={handleLoginChange}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password" className="text-sm font-medium text-slate-700">
                        Password
                      </Label>
                      <button
                        type="button"
                        className="text-xs font-medium text-slate-500 hover:text-slate-700 transition"
                        onClick={() => setShowLoginPassword(prev => !prev)}
                      >
                        {showLoginPassword ? 'Hide' : 'Show'} password
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="login-password"
                        name="password"
                        type={showLoginPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        placeholder="Enter your password"
                        className="pl-9 h-11 border-slate-200 bg-slate-50/60 focus:bg-white"
                        value={loginData.password}
                        onChange={handleLoginChange}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-slate-400 hover:text-slate-600 transition"
                        onClick={() => setShowLoginPassword(prev => !prev)}
                        aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                      >
                        {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 bg-slate-900 text-white hover:bg-slate-900/90 transition-all duration-200 shadow-sm"
                    disabled={isLoggingIn}
                  >
                    {isLoggingIn ? (
                      <>
                        <span className="flex h-4 w-4 items-center justify-center">
                          <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        </span>
                        Signing in...
                      </>
                    ) : (
                      <>
                        <LogIn className="mr-2 h-4 w-4" />
                        Sign in
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* Register Tab */}
              <TabsContent value="register" className="space-y-6 mt-0">
                <div className="space-y-1 text-center">
                  <h2 className="text-xl font-semibold text-slate-900">Create your account</h2>
                  <p className="text-sm text-slate-600">
                    Join Vishnu Finance and stay in control of your money with smart insights.
                  </p>
                </div>

                {registerError && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50/80 px-3 py-2 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{registerError}</span>
                  </div>
                )}

                {/* OAuth Provider Buttons */}
                <div className="space-y-3">
                  {/* Google Sign Up Button */}
                  {oauthProviders.google && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-11 border-slate-200 bg-white hover:bg-slate-50 transition-all duration-200"
                      onClick={() => {
                        window.location.href = '/api/auth/oauth/google';
                      }}
                    >
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Sign up with Google
                    </Button>
                  )}

                  {/* Microsoft Sign Up Button */}
                  {oauthProviders.microsoft && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-11 border-slate-200 bg-white hover:bg-slate-50 transition-all duration-200"
                      onClick={() => {
                        window.location.href = '/api/auth/oauth/microsoft';
                      }}
                    >
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 23 23" fill="none">
                        <path d="M0 0H11V11H0V0Z" fill="#F25022" />
                        <path d="M12 0H23V11H12V0Z" fill="#7FBA00" />
                        <path d="M0 12H11V23H0V12Z" fill="#00A4EF" />
                        <path d="M12 12H23V23H12V12Z" fill="#FFB900" />
                      </svg>
                      Sign up with Microsoft
                    </Button>
                  )}

                  {/* Apple Sign Up Button */}
                  {oauthProviders.apple && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-11 border-slate-200 bg-white hover:bg-slate-50 transition-all duration-200"
                      onClick={() => {
                        window.location.href = '/api/auth/oauth/apple';
                      }}
                    >
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                      </svg>
                      Sign up with Apple
                    </Button>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-slate-500">Or continue with</span>
                  </div>
                </div>

                <form className="space-y-5" onSubmit={handleRegisterSubmit}>
                  <div className="space-y-1.5">
                    <Label htmlFor="register-name" className="text-sm font-medium text-slate-700">
                      Full name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="register-name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        required
                        placeholder="John Doe"
                        className="pl-9 h-11 border-slate-200 bg-slate-50/60 focus:bg-white"
                        value={registerData.name}
                        onChange={handleRegisterChange}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="register-email" className="text-sm font-medium text-slate-700">
                      Email address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="register-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        placeholder="you@example.com"
                        className="pl-9 h-11 border-slate-200 bg-slate-50/60 focus:bg-white"
                        value={registerData.email}
                        onChange={handleRegisterChange}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="register-password" className="text-sm font-medium text-slate-700">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="register-password"
                        name="password"
                        type={showRegisterPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        placeholder="Create a password"
                        className="pl-9 h-11 border-slate-200 bg-slate-50/60 focus:bg-white"
                        value={registerData.password}
                        onChange={handleRegisterChange}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-slate-400 hover:text-slate-600 transition"
                        onClick={() => setShowRegisterPassword(prev => !prev)}
                        aria-label={showRegisterPassword ? 'Hide password' : 'Show password'}
                      >
                        {showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="register-confirm-password" className="text-sm font-medium text-slate-700">
                      Confirm password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="register-confirm-password"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        placeholder="Confirm your password"
                        className="pl-9 h-11 border-slate-200 bg-slate-50/60 focus:bg-white"
                        value={registerData.confirmPassword}
                        onChange={handleRegisterChange}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-slate-400 hover:text-slate-600 transition"
                        onClick={() => setShowConfirmPassword(prev => !prev)}
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 bg-blue-600 text-white hover:bg-blue-600/90 transition-all duration-200 shadow-sm"
                    disabled={isRegistering}
                  >
                    {isRegistering ? (
                      <>
                        <span className="flex h-4 w-4 items-center justify-center">
                          <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        </span>
                        Creating account...
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Create account
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-slate-500">
          By continuing, you agree to our{' '}
          <a href="/docs/terms.pdf" target="_blank" rel="noopener noreferrer" className="font-medium text-slate-600 underline-offset-4 hover:underline">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/docs/privacy.pdf" target="_blank" rel="noopener noreferrer" className="font-medium text-slate-600 underline-offset-4 hover:underline">
            Privacy Policy
          </a>
          .
        </div>
      </div>
    </div>
  );
}

export default function AuthPageClient({ initialTab }: AuthPageClientProps) {
  return <AuthPageInner initialTab={initialTab} />;
}


