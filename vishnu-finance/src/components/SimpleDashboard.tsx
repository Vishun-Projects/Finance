'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Calendar,
  PiggyBank,
  Activity,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { formatRupees } from '../lib/utils';
import Link from 'next/link';
import ModernCard from './ModernCard';
import ModernGrid from './ModernGrid';
import ModernPageLayout from './ModernPageLayout';
import UserValidation from './UserValidation';
import PageSkeleton from './PageSkeleton';

interface SimpleDashboardData {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number;
  upcomingDeadlines: number;
  activeGoals: number;
  recentTransactions: Array<{
    id: string;
    title: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    date: string;
  }>;
  financialHealthScore: number;
}

export default function SimpleDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [dashboardData, setDashboardData] = useState<SimpleDashboardData | null>(null);
  const [loading, setLoadingState] = useState(true);

  // Load data
  useEffect(() => {
    if (user && !authLoading) {
      loadDashboardData();
    }
  }, [user, authLoading]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      setLoadingState(true);
      const response = await fetch(`/api/dashboard-simple?userId=${user.id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoadingState(false);
    }
  };

  const handleRefresh = async () => {
    await loadDashboardData();
  };

  // Show authentication loading
  if (authLoading) {
    return (
      <div className="container-fluid px-6">
        <PageSkeleton />
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-white pt-16">
        <div className="container-fluid px-6">
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Please Login</h3>
            <p className="text-gray-600 mb-8">You need to be logged in to view your dashboard</p>
            <Link 
              href="/login" 
              className="inline-flex items-center px-4 py-2 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container-fluid px-6">
        <PageSkeleton />
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-white pt-16">
        <div className="container-fluid px-6">
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
            <p className="text-gray-600">Start by adding your first income or expense</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ModernPageLayout
      title="Dashboard"
      subtitle={`Welcome back, ${user.name || user.email}!`}
      actions={
        <button
          onClick={handleRefresh}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      }
    >
      {/* User Validation */}
      <UserValidation />

      {/* Key Metrics */}
      <ModernGrid columns={3} gap="lg">
        <ModernCard hover>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Income</p>
              <p className="text-2xl font-semibold text-gray-900">{formatRupees(dashboardData.totalIncome)}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </ModernCard>

        <ModernCard hover>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-2xl font-semibold text-gray-900">{formatRupees(dashboardData.totalExpenses)}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </ModernCard>

        <ModernCard hover>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Net Savings</p>
              <p className={`text-2xl font-semibold ${dashboardData.netSavings >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                {formatRupees(dashboardData.netSavings)}
              </p>
              <p className="text-sm text-gray-500">{dashboardData.savingsRate.toFixed(1)}% savings rate</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <PiggyBank className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </ModernCard>
      </ModernGrid>

      {/* Financial Health */}
      <ModernCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Financial Health</h3>
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-gray-400" />
            <span className="text-2xl font-semibold text-gray-900">{dashboardData.financialHealthScore}/100</span>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-gray-900 h-3 rounded-full transition-all duration-300"
            style={{ width: `${dashboardData.financialHealthScore}%` }}
          ></div>
        </div>
      </ModernCard>

      {/* Quick Actions */}
      <ModernCard>
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
        <ModernGrid columns={3} gap="md">
          <Link href="/income">
            <ModernCard hover className="h-full">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-green-50 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Add Income</p>
                  <p className="text-sm text-gray-600">Record new income</p>
                </div>
              </div>
            </ModernCard>
          </Link>

          <Link href="/expenses">
            <ModernCard hover className="h-full">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-red-50 rounded-lg">
                  <TrendingDown className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Add Expense</p>
                  <p className="text-sm text-gray-600">Record new expense</p>
                </div>
              </div>
            </ModernCard>
          </Link>

          <Link href="/goals">
            <ModernCard hover className="h-full">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Set Goal</p>
                  <p className="text-sm text-gray-600">Create financial goal</p>
                </div>
              </div>
            </ModernCard>
          </Link>
        </ModernGrid>
      </ModernCard>

      {/* Recent Transactions */}
      {dashboardData.recentTransactions.length > 0 && (
        <ModernCard>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
            <Link 
              href="/transactions"
              className="text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              View all →
            </Link>
          </div>
          <div className="space-y-4">
            {dashboardData.recentTransactions.slice(0, 5).map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${transaction.amount > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <div>
                    <p className="font-medium text-gray-900">{transaction.title}</p>
                    <p className="text-sm text-gray-600">{transaction.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-medium ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {transaction.amount > 0 ? '+' : ''}{formatRupees(transaction.amount)}
                  </p>
                  <p className="text-sm text-gray-600">{transaction.date}</p>
                </div>
              </div>
            ))}
          </div>
        </ModernCard>
      )}

      {/* Summary Stats */}
      <ModernGrid columns={2} gap="lg">
        <ModernCard hover>
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Active Goals</p>
              <p className="text-2xl font-semibold text-gray-900">{dashboardData.activeGoals}</p>
            </div>
          </div>
        </ModernCard>

        <ModernCard hover>
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-orange-50 rounded-lg">
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Upcoming Deadlines</p>
              <p className="text-2xl font-semibold text-gray-900">{dashboardData.upcomingDeadlines}</p>
            </div>
          </div>
        </ModernCard>
      </ModernGrid>
    </ModernPageLayout>
  );
}
