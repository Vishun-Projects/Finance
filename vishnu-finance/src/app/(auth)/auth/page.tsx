'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { useLoading } from '../../../contexts/LoadingContext';
import { Eye, EyeOff, Mail, Lock, User, AlertCircle, LogIn, UserPlus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

function AuthPageInner() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'register' ? 'register' : 'login';
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Force light theme on auth page
  useEffect(() => {
    document.documentElement.classList.remove('dark', 'high-contrast');
    document.documentElement.classList.add('light');
  }, []);
  
  // Login state
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Register state
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
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
          password: registerData.password
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
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                  <CardTitle className="text-xl font-semibold text-slate-900">Welcome Back</CardTitle>
                  <CardDescription className="text-slate-600">Access your financial dashboard</CardDescription>
                </div>

                {loginError && (
                  <div className="p-3.5 bg-red-50 border border-red-200/60 rounded-lg flex items-center space-x-3">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <p className="text-sm text-red-700 font-medium">{loginError}</p>
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm font-medium text-slate-700">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="login-email"
                        name="email"
                        type="email"
                        required
                        value={loginData.email}
                        onChange={handleLoginChange}
                        className="pl-10 h-11 border-slate-200 focus:border-slate-400 focus:ring-slate-400 text-slate-900"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-sm font-medium text-slate-700">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="login-password"
                        name="password"
                        type={showLoginPassword ? 'text' : 'password'}
                        required
                        value={loginData.password}
                        onChange={handleLoginChange}
                        className="pl-10 pr-10 h-11 border-slate-200 focus:border-slate-400 focus:ring-slate-400 text-slate-900"
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                        aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                      >
                        {showLoginPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    {isLoggingIn ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Signing In...
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4 mr-2" />
                        Sign In to Dashboard
                      </>
                    )}
                  </Button>
                </form>

                {/* Demo Credentials */}
                <div className="pt-5 border-t border-slate-200">
                  <div className="p-3.5 bg-slate-50/80 rounded-lg border border-slate-200/60">
                    <p className="text-xs font-semibold text-slate-700 text-center mb-2.5 uppercase tracking-wide">Demo Account</p>
                    <div className="text-xs text-slate-600 text-center space-y-1 font-mono">
                      <p><span className="font-medium text-slate-700">Email:</span> vishun.orv@gmail.com</p>
                      <p><span className="font-medium text-slate-700">Password:</span> password123</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Register Tab */}
              <TabsContent value="register" className="space-y-6 mt-0">
                <div className="space-y-1 text-center">
                  <CardTitle className="text-xl font-semibold text-slate-900">Create Account</CardTitle>
                  <CardDescription className="text-slate-600">Start managing your finances securely</CardDescription>
                </div>

                {registerError && (
                  <div className="p-3.5 bg-red-50 border border-red-200/60 rounded-lg flex items-center space-x-3">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <p className="text-sm text-red-700 font-medium">{registerError}</p>
                  </div>
                )}

                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name" className="text-sm font-medium text-slate-700">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="register-name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        required
                        value={registerData.name}
                        onChange={handleRegisterChange}
                        className="pl-10 h-11 border-slate-200 focus:border-slate-400 focus:ring-slate-400 text-slate-900"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email" className="text-sm font-medium text-slate-700">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="register-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={registerData.email}
                        onChange={handleRegisterChange}
                        className="pl-10 h-11 border-slate-200 focus:border-slate-400 focus:ring-slate-400 text-slate-900"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password" className="text-sm font-medium text-slate-700">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="register-password"
                        name="password"
                        type={showRegisterPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        value={registerData.password}
                        onChange={handleRegisterChange}
                        className="pl-10 pr-10 h-11 border-slate-200 focus:border-slate-400 focus:ring-slate-400 text-slate-900"
                        placeholder="Create a secure password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                        aria-label={showRegisterPassword ? 'Hide password' : 'Show password'}
                      >
                        {showRegisterPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-slate-500">Minimum 6 characters required</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-confirm-password" className="text-sm font-medium text-slate-700">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        id="register-confirm-password"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        value={registerData.confirmPassword}
                        onChange={handleRegisterChange}
                        className="pl-10 pr-10 h-11 border-slate-200 focus:border-slate-400 focus:ring-slate-400 text-slate-900"
                        placeholder="Re-enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isRegistering}
                    className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-all duration-200 shadow-md hover:shadow-lg mt-2"
                  >
                    {isRegistering ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating Account...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Create Account
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center space-y-2">
          <p className="text-xs text-slate-500">
            © 2024 Vishnu Finance. All rights reserved.
          </p>
          <p className="text-xs text-slate-400">
            Secure • Private • Encrypted
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading authentication...</div>}>
      <AuthPageInner />
    </Suspense>
  );
}

