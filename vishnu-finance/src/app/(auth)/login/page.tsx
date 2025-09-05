'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { DollarSign, Eye, EyeOff, Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { login } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const success = await login(formData.email, formData.password);
      
      if (success) {
        router.push('/dashboard');
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="neumorphic-button p-4 w-16 h-16 mx-auto mb-4">
            <DollarSign className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2">Vishnu's Finance</h1>
          <p className="text-accent">Mumbai, India • Personal Finance Management</p>
        </div>

        {/* Login Form */}
        <div className="neumorphic-card p-8">
          <h2 className="text-2xl font-bold text-primary text-center mb-6">Welcome Back</h2>
          
          {error && (
            <div className="neumorphic-inset p-4 mb-6 text-center">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-primary mb-3">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="w-5 h-5 text-accent" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="neumorphic-input block w-full pl-12 pr-4 py-4 text-primary placeholder-accent"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-primary mb-3">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-accent" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="neumorphic-input block w-full pl-12 pr-12 py-4 text-primary placeholder-accent"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 text-accent" />
                  ) : (
                    <Eye className="w-5 h-5 text-accent" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="neumorphic-button w-full flex justify-center items-center py-4 px-6 text-primary font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                  Signing In...
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 neumorphic-inset">
            <p className="text-sm text-accent text-center mb-2">Demo Credentials:</p>
            <p className="text-xs text-accent text-center">Email: demo@vishnufinance.com</p>
            <p className="text-xs text-accent text-center">Password: demo123</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-accent">
            © 2024 Vishnu's Finance. Built with ❤️ in Mumbai, India.
          </p>
        </div>
      </div>
    </div>
  );
}
