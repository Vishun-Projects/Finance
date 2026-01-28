'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [isDark, setIsDark] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // Apply theme changes
  useEffect(() => {
    console.log('Applying theme:', theme); // Debug log

    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      // Ensure body also gets dark background via CSS
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
      setIsDark(true);
      console.log('Applied dark theme');
    } else {
      document.documentElement.classList.remove('dark');
      // Ensure body gets light background
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
      setIsDark(false);
      console.log('Applied light theme');
    }
  }, [theme]);

  // Load theme from API on mount or reset to light when user logs out
  useEffect(() => {
    const loadTheme = async () => {
      if (user?.id) {
        try {
          const response = await fetch(`/api/user-preferences?userId=${user.id}`);
          if (response.ok) {
            const data = await response.json();
            if (data.theme && (data.theme === 'light' || data.theme === 'dark')) {
              setTheme(data.theme);
            }
          }
        } catch (error) {
          console.error('Error loading theme:', error);
        }
      } else {
        // Reset to light theme when user is null (logged out)
        setTheme('light');
      }
      setIsLoading(false);
    };

    loadTheme();
  }, [user]);

  const handleSetTheme = useCallback(async (newTheme: Theme) => {
    setTheme(newTheme);

    if (user?.id) {
      try {
        await fetch('/api/user-preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            navigationLayout: 'top', // Default or preserve existing if possible, but simplest here
            theme: newTheme,
            colorScheme: 'default'
          })
        });
      } catch (error) {
        console.error('Error saving theme:', error);
      }
    }
  }, [user?.id]);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    theme,
    setTheme: handleSetTheme,
    isDark,
    isLoading,
  }), [theme, handleSetTheme, isDark, isLoading]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
