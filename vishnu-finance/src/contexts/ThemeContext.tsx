'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from 'next-themes';
import type { ComponentProps } from 'react';
import { useAuth } from './AuthContext';

// Wrapper hook for compatibility with existing code
// Old interface: { theme: Theme, setTheme: (theme: Theme) => void, isDark: boolean, isLoading: boolean }
export function useTheme() {
  const context = useNextTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate isDark based on resolvedTheme
  const isDark = mounted && context.resolvedTheme === 'dark';

  return {
    ...context,
    isDark,
    isLoading: !mounted,
  };
}

function ThemeSync() {
  const { theme, setTheme } = useNextTheme();
  const { user } = useAuth();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Sync from Backend on Mount/User Change
  React.useEffect(() => {
    const loadThemePreference = async () => {
      if (!user?.id) return;

      try {
        const response = await fetch(`/api/user-preferences?userId=${user.id}`);
        if (response.ok) {
          const data = await response.json();
          // specific check: 'light', 'dark', or 'system'
          if (data.theme && ['light', 'dark', 'system'].includes(data.theme)) {
            setTheme(data.theme);
          }
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
      }
    };

    if (mounted) {
      loadThemePreference();
    }
  }, [user?.id, mounted, setTheme]);

  // Sync TO Backend when theme changes
  React.useEffect(() => {
    if (!mounted || !user?.id) return;

    const saveTheme = async () => {
      try {
        await fetch('/api/user-preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            theme: theme,
            navigationLayout: 'top',
            colorScheme: 'default'
          })
        });
      } catch (error) {
        console.error('Error saving theme preference:', error);
      }
    };

    saveTheme();

  }, [theme, user?.id, mounted]);

  return null;
}

export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      <ThemeSync />
      {children}
    </NextThemesProvider>
  );
}
