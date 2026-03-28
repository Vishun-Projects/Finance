import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, BASE_URL } from './client';
import { useAuthStore } from '../store/useStore';
import axios from 'axios';

// --- Types ---
export interface DashboardData {
    totalBalance?: number;
    totalIncome?: number;
    totalExpenses?: number;
    totalSavings?: number;
    netWorth?: number;
    recentTransactions?: Transaction[];
    savingsRate?: number;
}

export interface Transaction {
    id: string;
    description: string;
    transactionDate: string;
    creditAmount: number;
    debitAmount: number;
    financialCategory: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'INVESTMENT' | 'OTHER';
    category?: { id: string; name: string; color?: string; icon?: string } | null;
    store?: string | null;
    personName?: string | null;
    notes?: string | null;
}

export interface IncomeItem {
    id: string;
    name: string;
    amount: number;
    frequency: string;
    startDate: string;
}

// --- Auth ---
export function useLogin() {
    const { setAuth, setToken } = useAuthStore();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { email: string; password: string }) => {
            // Use plain axios to capture Set-Cookie headers from login
            const response = await axios.post(`${BASE_URL}/auth/login`, data, {
                withCredentials: true,
                headers: { 'Content-Type': 'application/json' },
            });
            return response;
        },
        onSuccess: (response) => {
            const user = response.data?.user;
            // Try to get token from Set-Cookie header
            const setCookie = response.headers['set-cookie'];
            let token = '';
            if (setCookie) {
                const cookieArr = Array.isArray(setCookie) ? setCookie : [setCookie];
                for (const cookie of cookieArr) {
                    const match = cookie.match(/auth-token=([^;]+)/);
                    if (match) { token = match[1]; break; }
                }
            }
            if (user) {
                setAuth(user, token);
                queryClient.invalidateQueries();
            }
        },
    });
}

// --- Dashboard ---
export function useDashboard() {
    const { user } = useAuthStore();
    return useQuery<DashboardData>({
        queryKey: ['dashboard', user?.id],
        queryFn: async () => {
            if (!user?.id) throw new Error('No user');
            const res = await apiClient.get('/dashboard-simple', {
                params: { userId: user.id },
            });
            return res.data;
        },
        enabled: !!user?.id,
        staleTime: 60_000,
    });
}

// --- Transactions ---
export function useTransactions(params?: { page?: number; pageSize?: number; type?: string; search?: string }) {
    const { user } = useAuthStore();
    return useQuery<{ transactions: Transaction[]; pagination: any }>({
        queryKey: ['transactions', user?.id, params],
        queryFn: async () => {
            const res = await apiClient.get('/transactions', {
                params: {
                    userId: user?.id,
                    page: params?.page ?? 1,
                    pageSize: params?.pageSize ?? 20,
                    ...(params?.type ? { type: params.type } : {}),
                    ...(params?.search ? { search: params.search } : {}),
                    includeTotals: true,
                },
            });
            return res.data;
        },
        enabled: !!user?.id,
        staleTime: 30_000,
    });
}

export function useCreateTransaction() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Partial<Transaction>) => apiClient.post('/transactions', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        },
    });
}

// --- Analytics ---
export function useAnalytics() {
    const { user } = useAuthStore();
    return useQuery({
        queryKey: ['analytics', user?.id],
        queryFn: async () => {
            const res = await apiClient.get('/analytics', {
                params: { userId: user?.id },
            });
            return res.data;
        },
        enabled: !!user?.id,
        staleTime: 60_000,
    });
}

// --- Income ---
export function useIncome() {
    const { user } = useAuthStore();
    return useQuery<{ data: IncomeItem[]; pagination: any }>({
        queryKey: ['income', user?.id],
        queryFn: async () => {
            const res = await apiClient.get('/income', {
                params: { userId: user?.id },
            });
            return res.data;
        },
        enabled: !!user?.id,
        staleTime: 60_000,
    });
}

// --- Expenses ---
export function useExpenses() {
    const { user } = useAuthStore();
    return useQuery({
        queryKey: ['expenses', user?.id],
        queryFn: async () => {
            const res = await apiClient.get('/expenses', {
                params: { userId: user?.id },
            });
            return res.data;
        },
        enabled: !!user?.id,
        staleTime: 60_000,
    });
}

// --- Deadlines ---
export function useDeadlines() {
    const { user } = useAuthStore();
    return useQuery({
        queryKey: ['deadlines', user?.id],
        queryFn: async () => {
            const res = await apiClient.get('/deadlines', {
                params: { userId: user?.id },
            });
            return res.data;
        },
        enabled: !!user?.id,
        staleTime: 60_000,
    });
}

// --- Goals (Plans) ---
export function useGoals() {
    const { user } = useAuthStore();
    return useQuery({
        queryKey: ['goals', user?.id],
        queryFn: async () => {
            const res = await apiClient.get('/goals', {
                params: { userId: user?.id },
            });
            return res.data;
        },
        enabled: !!user?.id,
        staleTime: 60_000,
    });
}

// --- Wishlist ---
export function useWishlist() {
    const { user } = useAuthStore();
    return useQuery({
        queryKey: ['wishlist', user?.id],
        queryFn: async () => {
            const res = await apiClient.get('/wishlist', {
                params: { userId: user?.id },
            });
            return res.data;
        },
        enabled: !!user?.id,
        staleTime: 60_000,
    });
}

// --- Education ---
export function useEducation() {
    return useQuery({
        queryKey: ['education'],
        queryFn: async () => {
            const res = await apiClient.get('/education');
            return res.data;
        },
        staleTime: 300_000, // 5 minutes — static content
    });
}

// --- AI Advisor ---
export function useSendAdvisorMessage() {
    const { user } = useAuthStore();
    return useMutation({
        mutationFn: async (message: string) => {
            const res = await apiClient.post('/advisor/chat', {
                message,
                userId: user?.id,
            });
            return res.data;
        },
    });
}

// --- User Profile ---
export function useUser() {
    const { user } = useAuthStore();
    return useQuery({
        queryKey: ['user-profile', user?.id],
        queryFn: async () => {
            const res = await apiClient.get('/user/profile');
            return res.data;
        },
        enabled: !!user?.id,
        staleTime: 300_000,
    });
}
