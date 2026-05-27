'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface PageHeaderState {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}

interface PageHeaderContextType extends PageHeaderState {
  setPageHeader: (state: PageHeaderState) => void;
  clearPageHeader: () => void;
}

const PageHeaderContext = createContext<PageHeaderContextType | undefined>(undefined);

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PageHeaderState>({});

  const setPageHeader = useCallback((next: PageHeaderState) => {
    setState(next);
  }, []);

  const clearPageHeader = useCallback(() => {
    setState({});
  }, []);

  return (
    <PageHeaderContext.Provider value={{ ...state, setPageHeader, clearPageHeader }}>
      {children}
    </PageHeaderContext.Provider>
  );
}

export function usePageHeader() {
  const context = useContext(PageHeaderContext);
  if (context === undefined) {
    throw new Error('usePageHeader must be used within a PageHeaderProvider');
  }
  return context;
}

/** Set page header on mount; clears on unmount. */
export function useSetPageHeader(state: PageHeaderState) {
  const { setPageHeader, clearPageHeader } = usePageHeader();

  React.useEffect(() => {
    setPageHeader(state);
    return () => clearPageHeader();
  }, [state.title, state.subtitle, clearPageHeader, setPageHeader]);
}
