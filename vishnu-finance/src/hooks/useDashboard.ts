'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, apiFetcher, mutationHelpers } from '@/lib/react-query';
import { useAuth } from '@/contexts/AuthContext';

// Dashboard data hook with React Query optimization
export function useDashboard(period: string = '6') {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: dashboardData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.dashboardData(user?.id || '', period),
    queryFn: () => apiFetcher.fetchDashboardData(user?.id || '', period),
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchOnWindowFocus: true,
  });

  return {
    dashboardData,
    isLoading,
    error,
    refetch,
  };
}

// Analytics hook with caching
export function useAnalytics(period: string = '6', type?: string) {
  const { user } = useAuth();

  const {
    data: analyticsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.analytics(user?.id || '', period, type),
    queryFn: () => apiFetcher.fetchAnalytics(user?.id || '', period, type),
    enabled: !!user?.id,
    staleTime: 60000, // 1 minute
    gcTime: 600000, // 10 minutes
    refetchInterval: 120000, // Refetch every 2 minutes
  });

  return {
    analyticsData,
    isLoading,
    error,
    refetch,
  };
}

// Financial data hooks
export function useIncome() {
  const { user } = useAuth();

  const {
    data: incomeData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.income(user?.id || ''),
    queryFn: () => apiFetcher.fetchIncome(user?.id || ''),
    enabled: !!user?.id,
    staleTime: 30000,
    gcTime: 300000,
  });

  return {
    incomeData,
    isLoading,
    error,
    refetch,
  };
}

export function useExpenses() {
  const { user } = useAuth();

  const {
    data: expensesData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.expenses(user?.id || ''),
    queryFn: () => apiFetcher.fetchExpenses(user?.id || ''),
    enabled: !!user?.id,
    staleTime: 30000,
    gcTime: 300000,
  });

  return {
    expensesData,
    isLoading,
    error,
    refetch,
  };
}

export function useGoals() {
  const { user } = useAuth();

  const {
    data: goalsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.goals(user?.id || ''),
    queryFn: () => apiFetcher.fetchGoals(user?.id || ''),
    enabled: !!user?.id,
    staleTime: 60000,
    gcTime: 600000,
  });

  return {
    goalsData,
    isLoading,
    error,
    refetch,
  };
}

export function useDeadlines() {
  const { user } = useAuth();

  const {
    data: deadlinesData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.deadlines(user?.id || ''),
    queryFn: () => apiFetcher.fetchDeadlines(user?.id || ''),
    enabled: !!user?.id,
    staleTime: 30000,
    gcTime: 300000,
  });

  return {
    deadlinesData,
    isLoading,
    error,
    refetch,
  };
}

// Mutation hooks for optimistic updates
export function useAddIncome() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (incomeData: any) => 
      apiFetcher.fetch(`/api/income`, {
        method: 'POST',
        body: JSON.stringify({ ...incomeData, userId: user?.id }),
      }),
    ...mutationHelpers.addIncome(queryClient, user?.id || ''),
  });
}

export function useAddExpense() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (expenseData: any) => 
      apiFetcher.fetch(`/api/expenses`, {
        method: 'POST',
        body: JSON.stringify({ ...expenseData, userId: user?.id }),
      }),
    ...mutationHelpers.addExpense(queryClient, user?.id || ''),
  });
}

export function useAddGoal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (goalData: any) => 
      apiFetcher.fetch(`/api/goals`, {
        method: 'POST',
        body: JSON.stringify({ ...goalData, userId: user?.id }),
      }),
    ...mutationHelpers.addGoal(queryClient, user?.id || ''),
  });
}

// AI Insights hook
export function useAIInsights(type?: string) {
  const { user } = useAuth();

  const {
    data: insightsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.aiInsights(user?.id || '', type),
    queryFn: () => apiFetcher.fetchAIInsights(user?.id || '', type),
    enabled: !!user?.id,
    staleTime: 300000, // 5 minutes
    gcTime: 900000, // 15 minutes
  });

  return {
    insightsData,
    isLoading,
    error,
    refetch,
  };
}

// Market data hooks
export function useMarketData() {
  const {
    data: marketData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.marketData(),
    queryFn: () => apiFetcher.fetchMarketData(),
    staleTime: 300000, // 5 minutes
    gcTime: 600000, // 10 minutes
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  return {
    marketData,
    isLoading,
    error,
    refetch,
  };
}

export function useCurrencyRates() {
  const {
    data: currencyRates,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.currencyRates(),
    queryFn: () => apiFetcher.fetchCurrencyRates(),
    staleTime: 600000, // 10 minutes
    gcTime: 1800000, // 30 minutes
    refetchInterval: 600000, // Refetch every 10 minutes
  });

  return {
    currencyRates,
    isLoading,
    error,
    refetch,
  };
}
