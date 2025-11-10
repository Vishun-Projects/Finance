'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, LogIn, UserPlus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
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

  const router = useRouter();
  const { login } = useAuth();
  const { setLoading } = useLoading();

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
    } catch (err) {
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
    } catch (err) {
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
            <div className="relative">
              <img
                src="/icon-removebg-preview.png"
                alt="Vishnu Finance Logo"
                className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 object-contain"
                loading="eager"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  console.error('Failed to load logo image:', target.src);
                  // Fallback to android chrome icon if new image fails
                  if (!target.src.includes('android-chrome')) {
                    target.src = '/android-chrome-512x512.png';
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


