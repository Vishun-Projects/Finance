'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Browser } from '@capacitor/browser';
import { AlertCircle, LogIn, UserPlus, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLoading } from '@/contexts/LoadingContext';
import { cn } from '@/lib/utils';

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

  // Login state
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Register state
  const [registerData, setRegisterData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Config
  const [logoSrc, setLogoSrc] = useState('/icon-removebg-preview.png');
  const [oauthProviders, setOauthProviders] = useState({ google: true, microsoft: false, apple: false });

  const router = useRouter();
  const { login } = useAuth();
  const { setLoading } = useLoading();

  // Check OAuth
  useEffect(() => {
    const checkOAuthProviders = async () => {
      try {
        const response = await fetch('/api/auth/oauth/config');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.providers) setOauthProviders(data.providers);
        }
      } catch (error) { console.error('OAuth check failed', error); }
    };
    checkOAuthProviders();
  }, []);

  // Handlers
  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setLoginError('');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');
    setLoading(true, 'Accessing secure vault...');

    try {
      const authenticatedUser = await login(loginData.email, loginData.password);
      if (authenticatedUser) {
        const destination = authenticatedUser.role === 'SUPERUSER' ? '/admin' : '/dashboard';
        router.push(destination);
      } else {
        setLoginError('Invalid credentials');
      }
    } catch (error) {
      setLoginError('Connection failed. Please retrying.');
    } finally {
      setIsLoggingIn(false);
      setLoading(false);
    }
  };

  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRegisterData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setRegisterError('');
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (registerData.password !== registerData.confirmPassword) {
      setRegisterError('Passwords do not match');
      return;
    }
    if (registerData.password.length < 6) {
      setRegisterError('Password must be at least 6 characters');
      return;
    }

    setIsRegistering(true);
    setRegisterError('');
    setLoading(true, 'Creating your portfolio...');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: registerData.name, email: registerData.email, password: registerData.password }),
      });

      const data = await response.json();
      if (response.ok) {
        const loginUser = await login(registerData.email, registerData.password);
        router.push(loginUser ? (loginUser.role === 'SUPERUSER' ? '/admin' : '/dashboard') : '/');
      } else {
        setRegisterError(data.error || 'Registration failed');
      }
    } catch (error) {
      setRegisterError('Registration failed. Please try again.');
    } finally {
      setIsRegistering(false);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-black text-white selection:bg-amber-500/30 selection:text-amber-200">
      {/* Left Panel - Premium Visuals */}
      <div className="relative hidden w-[60%] lg:flex flex-col justify-between overflow-hidden bg-zinc-900">
        <div className="absolute inset-0">
          <Image
            src="/premium-auth-bg.png"
            alt="Premium Background"
            fill
            className="object-cover opacity-90 scale-105"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/20" />
        </div>

        <div className="relative z-10 p-12 flex items-center gap-3">
          <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-white/10 shadow-[0_0_15px_rgba(255,215,0,0.3)] bg-black/50 backdrop-blur-md flex items-center justify-center">
            <Image src={logoSrc} alt="Logo" width={32} height={32} className="object-contain" />
          </div>
          <span className="text-xl font-bold tracking-wide text-white">Vishnu Finance</span>
        </div>

        <div className="relative z-10 p-12 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            <h1 className="text-5xl font-bold leading-tight mb-6 tracking-tight">
              Master your wealth with <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600">precision</span>.
            </h1>
            <p className="text-lg text-zinc-300 mb-8 leading-relaxed max-w-lg">
              Experience the next generation of financial intelligence. Track, analyze, and grow your net worth with institutional-grade tools.
            </p>

            <div className="flex gap-6 text-sm text-zinc-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-500" />
                <span>Smart Analytics</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-500" />
                <span>Secure Vault</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-500" />
                <span>AI Insights</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative bg-black">
        {/* Mobile Background (Absolute) */}
        <div className="absolute inset-0 lg:hidden z-0">
          <Image
            src="/premium-auth-bg.png"
            alt="Background"
            fill
            className="object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/90 to-black" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm z-10 space-y-8"
        >
          {/* Mobile Logo */}
          <div className="flex flex-col items-center gap-4 lg:hidden mb-8">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-black border border-amber-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.2)] icon-glow">
              <Image src={logoSrc} alt="Logo" width={40} height={40} className="object-contain" />
            </div>
            <h2 className="text-2xl font-bold text-white">Vishnu Finance</h2>
          </div>

          <div>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AuthTab)} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-zinc-900/50 p-1 border border-white/5 rounded-xl backdrop-blur-sm">
                <TabsTrigger
                  value="login"
                  className="rounded-lg data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400 font-medium transition-all"
                >
                  Log In
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="rounded-lg data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400 font-medium transition-all"
                >
                  Create Account
                </TabsTrigger>
              </TabsList>

              <div className="mt-8">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <TabsContent value="login" className="space-y-6 mt-0">
                      <div className="text-center mb-6">
                        <h3 className="text-2xl font-semibold text-white">Welcome Back</h3>
                        <p className="text-zinc-400 text-sm mt-1">Enter your credentials to access your dashboard</p>
                      </div>

                      {loginError && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                          <AlertCircle size={16} /> {loginError}
                        </div>
                      )}

                      <form onSubmit={handleLoginSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">Email</Label>
                          <Input
                            name="email"
                            type="email"
                            placeholder="name@example.com"
                            value={loginData.email}
                            onChange={handleLoginChange}
                            className="bg-zinc-900/50 border-white/10 text-white placeholder:text-zinc-600 focus:border-amber-500/50 focus:ring-amber-500/20 h-11 rounded-lg"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <Label className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">Password</Label>
                            <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="text-xs text-amber-500 hover:text-amber-400">
                              {showLoginPassword ? 'Hide' : 'Show'}
                            </button>
                          </div>
                          <Input
                            name="password"
                            type={showLoginPassword ? 'text' : 'password'}
                            placeholder="Enter your password"
                            value={loginData.password}
                            onChange={handleLoginChange}
                            className="bg-zinc-900/50 border-white/10 text-white placeholder:text-zinc-600 focus:border-amber-500/50 focus:ring-amber-500/20 h-11 rounded-lg"
                            required
                          />
                        </div>

                        <Button type="submit" className="w-full h-11 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-bold rounded-lg transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)]" disabled={isLoggingIn}>
                          {isLoggingIn ? 'Authenticating...' : 'Sign In'} <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                      </form>

                      {oauthProviders.google && (
                        <>
                          <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                            <div className="relative flex justify-center text-xs uppercase"><span className="bg-black px-2 text-zinc-500">Or continue with</span></div>
                          </div>
                          <Button variant="outline" className="w-full h-11 bg-white text-black hover:bg-zinc-200 border-none font-medium text-sm rounded-lg" onClick={() => Browser.open({ url: `${window.location.origin}/api/auth/oauth/google`, windowName: '_self' })}>
                            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                            Google
                          </Button>
                        </>
                      )}
                    </TabsContent>

                    <TabsContent value="register" className="space-y-6 mt-0">
                      <div className="text-center mb-6">
                        <h3 className="text-2xl font-semibold text-white">Join the Elite</h3>
                        <p className="text-zinc-400 text-sm mt-1">Start your financial journey today</p>
                      </div>

                      {registerError && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                          <AlertCircle size={16} /> {registerError}
                        </div>
                      )}

                      <form onSubmit={handleRegisterSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">Full Name</Label>
                          <Input
                            name="name"
                            type="text"
                            placeholder="John Doe"
                            value={registerData.name}
                            onChange={handleRegisterChange}
                            className="bg-zinc-900/50 border-white/10 text-white placeholder:text-zinc-600 focus:border-amber-500/50 focus:ring-amber-500/20 h-11 rounded-lg"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">Email</Label>
                          <Input
                            name="email"
                            type="email"
                            placeholder="name@example.com"
                            value={registerData.email}
                            onChange={handleRegisterChange}
                            className="bg-zinc-900/50 border-white/10 text-white placeholder:text-zinc-600 focus:border-amber-500/50 focus:ring-amber-500/20 h-11 rounded-lg"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">Password</Label>
                            <Input
                              name="password"
                              type={showRegisterPassword ? "text" : "password"}
                              value={registerData.password}
                              onChange={handleRegisterChange}
                              className="bg-zinc-900/50 border-white/10 text-white placeholder:text-zinc-600 focus:border-amber-500/50 focus:ring-amber-500/20 h-11 rounded-lg"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">Confirm</Label>
                            <Input
                              name="confirmPassword"
                              type={showRegisterPassword ? "text" : "password"}
                              value={registerData.confirmPassword}
                              onChange={handleRegisterChange}
                              className="bg-zinc-900/50 border-white/10 text-white placeholder:text-zinc-600 focus:border-amber-500/50 focus:ring-amber-500/20 h-11 rounded-lg"
                              required
                            />
                          </div>
                        </div>

                        <Button type="submit" className="w-full h-11 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-bold rounded-lg transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_30px_rgba(245,158,11,0.4)]" disabled={isRegistering}>
                          {isRegistering ? 'Processing...' : 'Create Account'}
                        </Button>
                      </form>
                    </TabsContent>
                  </motion.div>
                </AnimatePresence>
              </div>
            </Tabs>

            <div className="mt-8 text-center text-xs text-zinc-600">
              Protected by Vishnu Finance Security. <br />
              By continuing, you agree to our Terms & Policy.
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function AuthPageClient({ initialTab }: AuthPageClientProps) {
  return <AuthPageInner initialTab={initialTab} />;
}


