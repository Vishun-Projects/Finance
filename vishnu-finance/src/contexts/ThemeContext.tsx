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
  const [isInitialized, setIsInitialized] = React.useState(false);
  const lastSavedTheme = React.useRef<string | undefined>(undefined);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Sync from Backend on Mount/User Change
  React.useEffect(() => {
    if (!user?.id || !mounted) return;

    const loadThemePreference = async () => {
      try {
        const response = await fetch(`/api/user-preferences?userId=${user.id}`);
        if (response.ok) {
          const data = await response.json();
          const validThemes = ['light', 'dark', 'system'];
          if (data.theme && validThemes.includes(data.theme)) {
            // Only update if different to avoid redundant cycles
            if (theme !== data.theme) {
              setTheme(data.theme);
            }
            lastSavedTheme.current = data.theme;
          }
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    loadThemePreference();
  }, [user?.id, mounted]);

  // Sync TO Backend when theme changes
  React.useEffect(() => {
    // Only save if initialized, mounted, user present, theme is valid, and theme is different from last saved
    const validThemes = ['light', 'dark', 'system'];
    if (
      !isInitialized ||
      !mounted ||
      !user?.id ||
      !theme ||
      !validThemes.includes(theme) ||
      theme === lastSavedTheme.current
    ) return;

    const saveTheme = async () => {
      try {
        const themeToSave = theme;
        await fetch('/api/user-preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            theme: themeToSave,
            navigationLayout: 'top',
            colorScheme: 'default'
          })
        });
        lastSavedTheme.current = themeToSave;
      } catch (error) {
        console.error('Error saving theme preference:', error);
      }
    };

    // Debounce slightly to avoid rapid updates
    const timer = setTimeout(saveTheme, 800);
    return () => clearTimeout(timer);

  }, [theme, user?.id, mounted, isInitialized]);

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
