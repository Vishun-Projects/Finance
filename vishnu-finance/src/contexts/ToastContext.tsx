'use client';

import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { toast as sonnerToast } from 'sonner';

interface ToastContextType {
  success: (title: string, message?: string, duration?: number) => void;
  error: (title: string, message?: string, duration?: number) => void;
  warning: (title: string, message?: string, duration?: number) => void;
  info: (title: string, message?: string, duration?: number) => void;
  addToast: (toast: { type: 'success' | 'error' | 'warning' | 'info'; title: string; message?: string; duration?: number }) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const success = useCallback((title: string, message?: string, duration?: number) => {
    if (message) {
      sonnerToast.success(title, {
        description: message,
        duration: duration || 5000,
      });
    } else {
      sonnerToast.success(title, {
        duration: duration || 5000,
      });
    }
  }, []);

  const error = useCallback((title: string, message?: string, duration?: number) => {
    if (message) {
      sonnerToast.error(title, {
        description: message,
        duration: duration || 5000,
      });
    } else {
      sonnerToast.error(title, {
        duration: duration || 5000,
      });
    }
  }, []);

  const warning = useCallback((title: string, message?: string, duration?: number) => {
    if (message) {
      sonnerToast.warning(title, {
        description: message,
        duration: duration || 5000,
      });
    } else {
      sonnerToast.warning(title, {
        duration: duration || 5000,
      });
    }
  }, []);

  const info = useCallback((title: string, message?: string, duration?: number) => {
    if (message) {
      sonnerToast.info(title, {
        description: message,
        duration: duration || 5000,
      });
    } else {
      sonnerToast.info(title, {
        duration: duration || 5000,
      });
    }
  }, []);

  const addToast = useCallback((toast: { type: 'success' | 'error' | 'warning' | 'info'; title: string; message?: string; duration?: number }) => {
    const { type, title, message, duration } = toast;
    
    const toastOptions = {
      description: message,
      duration: duration || 5000,
    };

    switch (type) {
      case 'success':
        sonnerToast.success(title, toastOptions);
        break;
      case 'error':
        sonnerToast.error(title, toastOptions);
        break;
      case 'warning':
        sonnerToast.warning(title, toastOptions);
        break;
      case 'info':
        sonnerToast.info(title, toastOptions);
        break;
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    sonnerToast.dismiss(id);
  }, []);

  return (
    <ToastContext.Provider
      value={{
        success,
        error,
        warning,
        info,
        addToast,
        removeToast,
      }}
    >
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
