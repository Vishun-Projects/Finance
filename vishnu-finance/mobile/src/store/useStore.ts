import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Platform } from 'react-native';

// Cross-platform storage: SecureStore on native, localStorage on web
let platformStorage: any;

if (Platform.OS === 'web') {
    platformStorage = {
        getItem: (name: string) => {
            const val = localStorage.getItem(name);
            return Promise.resolve(val);
        },
        setItem: (name: string, value: string) => {
            localStorage.setItem(name, value);
            return Promise.resolve();
        },
        removeItem: (name: string) => {
            localStorage.removeItem(name);
            return Promise.resolve();
        },
    };
} else {
    const SecureStore = require('expo-secure-store');
    platformStorage = {
        getItem: (name: string) => SecureStore.getItemAsync(name),
        setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value),
        removeItem: (name: string) => SecureStore.deleteItemAsync(name),
    };
}

export interface User {
    id: string;
    email: string;
    name?: string;
    role?: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    theme: 'light' | 'dark';
    setAuth: (user: User, token: string) => void;
    setToken: (token: string) => void;
    setTheme: (theme: 'light' | 'dark') => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            theme: 'dark',
            setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
            setToken: (token) => set({ token }),
            setTheme: (theme) => set({ theme }),
            logout: () => set({ user: null, token: null, isAuthenticated: false }),
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => platformStorage),
        }
    )
);
