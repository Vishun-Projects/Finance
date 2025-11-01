// React Query configuration for optimal data fetching and caching
import { QueryClient } from '@tanstack/react-query';

// Create a client with optimized settings for performance
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes by default - data is fresh during this time
      staleTime: 5 * 60 * 1000,
      // Keep data in cache for 15 minutes - longer retention for better performance
      gcTime: 15 * 60 * 1000,
      // Retry failed requests 2 times
      retry: 2,
      // Retry delay with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Disable refetch on window focus - prevents unnecessary requests
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect - use cached data instead
      refetchOnReconnect: false,
      // Disable background polling by default - manual invalidation preferred
      refetchInterval: false,
      // Refetch on mount only if data is stale
      refetchOnMount: true,
    },
    mutations: {
      // Retry mutations once
      retry: 1,
      // Optimistic updates for better UX
      onMutate: async (variables) => {
        // Cancel outgoing refetches
        await queryClient.cancelQueries();
      },
    },
  },
});

// Query keys for consistent caching
export const queryKeys = {
  // Dashboard queries
  dashboard: (userId: string) => ['dashboard', userId],
  dashboardData: (userId: string, period?: string) => ['dashboard', 'data', userId, period],
  
  // Analytics queries
  analytics: (userId: string, period?: string, type?: string) => ['analytics', userId, period, type],
  
  // User data queries
  user: (userId: string) => ['user', userId],
  userPreferences: (userId: string) => ['user', 'preferences', userId],
  
  // Financial data queries
  income: (userId: string) => ['income', userId],
  expenses: (userId: string) => ['expenses', userId],
  goals: (userId: string) => ['goals', userId],
  deadlines: (userId: string) => ['deadlines', userId],
  wishlist: (userId: string) => ['wishlist', userId],
  salaryStructure: (userId: string) => ['salary-structure', userId],
  
  // Reports queries
  reports: (userId: string, period?: string) => ['reports', userId, period],
  
  // AI insights queries
  aiInsights: (userId: string, type?: string) => ['ai-insights', userId, type],
  
  // Market data queries
  marketData: () => ['market-data'],
  currencyRates: () => ['currency-rates'],
} as const;

// Optimized fetch functions with error handling
export const apiFetcher = {
  // Generic fetch with error handling
  async fetch<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  },

  // Dashboard data fetcher
  async fetchDashboardData(userId: string, period: string = '6') {
    return this.fetch(`/api/analytics?userId=${userId}&period=${period}`);
  },

  // Analytics fetcher
  async fetchAnalytics(userId: string, period: string = '6', type?: string) {
    const params = new URLSearchParams({ userId, period });
    if (type) params.append('type', type);
    return this.fetch(`/api/analytics?${params}`);
  },

  // Financial data fetchers
  async fetchIncome(userId: string) {
    return this.fetch(`/api/income?userId=${userId}`);
  },

  async fetchExpenses(userId: string) {
    return this.fetch(`/api/expenses?userId=${userId}`);
  },

  async fetchGoals(userId: string) {
    return this.fetch(`/api/goals?userId=${userId}`);
  },

  async fetchDeadlines(userId: string) {
    return this.fetch(`/api/deadlines?userId=${userId}`);
  },

  async fetchWishlist(userId: string) {
    return this.fetch(`/api/wishlist?userId=${userId}`);
  },

  async fetchSalaryStructure(userId: string) {
    return this.fetch(`/api/salary-structure?userId=${userId}`);
  },

  // AI insights fetcher
  async fetchAIInsights(userId: string, type?: string) {
    const params = new URLSearchParams({ userId });
    if (type) params.append('type', type);
    return this.fetch(`/api/ai-insights?${params}`);
  },

  // Market data fetchers
  async fetchMarketData() {
    return this.fetch('/api/market-data');
  },

  async fetchCurrencyRates() {
    return this.fetch('/api/currency-rates');
  },
};

// Mutation helpers for optimistic updates
export const mutationHelpers = {
  // Optimistic update for adding income
  addIncome: (queryClient: QueryClient, userId: string) => ({
    onMutate: async (newIncome: any) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.income(userId) });
      const previousIncome = queryClient.getQueryData(queryKeys.income(userId));
      
      queryClient.setQueryData(queryKeys.income(userId), (old: any) => 
        old ? [...old, newIncome] : [newIncome]
      );
      
      return { previousIncome };
    },
    onError: (err: any, newIncome: any, context: any) => {
      queryClient.setQueryData(queryKeys.income(userId), context.previousIncome);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.income(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(userId) });
    },
  }),

  // Optimistic update for adding expenses
  addExpense: (queryClient: QueryClient, userId: string) => ({
    onMutate: async (newExpense: any) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.expenses(userId) });
      const previousExpenses = queryClient.getQueryData(queryKeys.expenses(userId));
      
      queryClient.setQueryData(queryKeys.expenses(userId), (old: any) => 
        old ? [...old, newExpense] : [newExpense]
      );
      
      return { previousExpenses };
    },
    onError: (err: any, newExpense: any, context: any) => {
      queryClient.setQueryData(queryKeys.expenses(userId), context.previousExpenses);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(userId) });
    },
  }),

  // Optimistic update for adding goals
  addGoal: (queryClient: QueryClient, userId: string) => ({
    onMutate: async (newGoal: any) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.goals(userId) });
      const previousGoals = queryClient.getQueryData(queryKeys.goals(userId));
      
      queryClient.setQueryData(queryKeys.goals(userId), (old: any) => 
        old ? [...old, newGoal] : [newGoal]
      );
      
      return { previousGoals };
    },
    onError: (err: any, newGoal: any, context: any) => {
      queryClient.setQueryData(queryKeys.goals(userId), context.previousGoals);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(userId) });
    },
  }),
};

// Performance monitoring for React Query
export const queryPerformanceMonitor = {
  // Track query performance
  trackQuery: (queryKey: string[], startTime: number) => {
    const duration = performance.now() - startTime;
    if (duration > 1000) {
      console.warn(`🐌 Slow query: ${queryKey.join('.')} took ${duration.toFixed(2)}ms`);
    }
  },

  // Track mutation performance
  trackMutation: (mutationKey: string, startTime: number) => {
    const duration = performance.now() - startTime;
    if (duration > 2000) {
      console.warn(`🐌 Slow mutation: ${mutationKey} took ${duration.toFixed(2)}ms`);
    }
  },
};
