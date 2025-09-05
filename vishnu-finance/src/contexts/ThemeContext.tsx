'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';

export type Theme = 'light' | 'dark' | 'high-contrast';

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
    if (theme === 'high-contrast') {
      document.documentElement.classList.add('high-contrast');
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    } else if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('high-contrast');
      setIsDark(true);
    } else {
      document.documentElement.classList.remove('dark', 'high-contrast');
      setIsDark(false);
    }
  }, [theme]);

  // Load theme from API on mount
  useEffect(() => {
    const loadTheme = async () => {
      if (user?.id) {
        try {
          const response = await fetch(`/api/user-preferences?userId=${user.id}`);
          if (response.ok) {
            const data = await response.json();
            if (data.theme) {
              setTheme(data.theme);
            }
          }
        } catch (error) {
          console.error('Error loading theme:', error);
        }
      }
      setIsLoading(false);
    };

    loadTheme();
  }, [user]);

  const handleSetTheme = async (newTheme: Theme) => {
    setTheme(newTheme);
    
    if (user?.id) {
      try {
        await fetch('/api/user-preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            navigationLayout: 'top',
            theme: newTheme,
            colorScheme: 'default'
          })
        });
      } catch (error) {
        console.error('Error saving theme:', error);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme, isDark, isLoading }}>
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
