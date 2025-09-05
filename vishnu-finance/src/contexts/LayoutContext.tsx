'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';

type NavigationLayout = 'sidebar' | 'top';

interface LayoutContextType {
  layout: NavigationLayout;
  setLayout: (layout: NavigationLayout) => void;
  isLoading: boolean;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [layout, setLayout] = useState<NavigationLayout>('sidebar');
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // Save layout preference to database when it changes
  const handleSetLayout = async (newLayout: NavigationLayout) => {
    setLayout(newLayout);
    
    if (user?.id) {
      try {
        await fetch('/api/user-preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            navigationLayout: newLayout,
            theme: 'light', // Keep existing theme
            colorScheme: 'default' // Keep existing color scheme
          })
        });
      } catch (error) {
        console.error('Error saving layout preference:', error);
      }
    }
    
    // Update body class for CSS adjustments
    document.body.classList.remove('sidebar-layout', 'top-navbar-layout');
    document.body.classList.add(`${newLayout}-layout`);
  };

  // Load layout preference from database on mount
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/user-preferences?userId=${user.id}`);
        if (response.ok) {
          const preferences = await response.json();
          if (preferences.navigationLayout) {
            setLayout(preferences.navigationLayout);
          }
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, [user?.id]);

  return (
    <LayoutContext.Provider value={{ layout, setLayout: handleSetLayout, isLoading }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
}
