'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  TrendingUp, 
  TrendingDown, 
  PiggyBank, 
  AlertTriangle,
  CheckCircle,
  Target,
  Calendar,
  Activity
} from 'lucide-react';
import { formatRupees } from '../../../lib/utils';
import PageSkeleton from '@/components/feedback/PageSkeleton';

interface HealthData {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number;
  financialHealthScore: number;
  activeGoals: number;
  upcomingDeadlines: number;
  recentTransactions: any[];
}

export default function FinancialHealthPage() {
  const { user, loading: authLoading } = useAuth();
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && !authLoading) {
      loadHealthData();
    }
  }, [user, authLoading]);

  const loadHealthData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      const response = await fetch(`/api/dashboard-simple?userId=${user.id}&start=${start}&end=${end}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch health data');
      }
      
      const data = await response.json();
      setHealthData(data);
    } catch (error) {
      console.error('Error loading health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const monthLabel = useMemo(() => {
    const now = new Date();
    return now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }, []);

  const getHealthStatus = (score: number) => {
    if (score >= 80) return { status: 'Excellent', color: 'text-green-600', bg: 'bg-green-50' };
    if (score >= 60) return { status: 'Good', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (score >= 40) return { status: 'Fair', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { status: 'Needs Improvement', color: 'text-red-600', bg: 'bg-red-50' };
  };

  const getSavingsAdvice = (rate: number) => {
    if (rate >= 20) return { advice: 'Excellent savings rate! Keep it up.', icon: CheckCircle, color: 'text-green-600' };
    if (rate >= 10) return { advice: 'Good savings rate. Consider increasing to 20%.', icon: TrendingUp, color: 'text-blue-600' };
    if (rate >= 5) return { advice: 'Moderate savings rate. Aim for at least 10%.', icon: AlertTriangle, color: 'text-yellow-600' };
    return { advice: 'Low savings rate. Focus on reducing expenses and increasing income.', icon: AlertTriangle, color: 'text-red-600' };
  };

  if (authLoading || loading) {
    return <PageSkeleton />;
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Please Login</h3>
        <p className="text-gray-600 mb-8">You need to be logged in to view your financial health</p>
      </div>
    );
  }

  if (!healthData) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
        <p className="text-gray-600">Start by adding your first income or expense</p>
      </div>
    );
  }

  const healthStatus = getHealthStatus(healthData.financialHealthScore);
  const savingsAdvice = getSavingsAdvice(healthData.savingsRate);

  return (
    <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Financial Health Score</h1>
            <p className="text-gray-600">Monthly overview for {monthLabel}</p>
          </div>
        </div>

        {/* Health Score Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Overall Health Score</h2>
            <div className={`px-4 py-2 rounded-lg ${healthStatus.bg}`}>
              <span className={`font-semibold ${healthStatus.color}`}>
                {healthStatus.status}
              </span>
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-6xl font-bold text-gray-900 mb-2">
              {healthData.financialHealthScore}
            </div>
            <div className="text-gray-600 mb-6">out of 100</div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
              <div 
                className="bg-gray-900 h-3 rounded-full transition-all duration-500"
                style={{ width: `${healthData.financialHealthScore}%` }}
              ></div>
            </div>
          </div>

          {/* Health Score Explanation */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">How is this score calculated?</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• <strong>Savings Rate (40%):</strong> Higher savings rate = better score</p>
              <p>• <strong>Income Stability (25%):</strong> Consistent income sources</p>
              <p>• <strong>Expense Management (20%):</strong> Controlled spending patterns</p>
              <p>• <strong>Goal Progress (10%):</strong> Active financial goals</p>
              <p>• <strong>Debt Management (5%):</strong> Low debt-to-income ratio</p>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Income */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">Monthly Income ({monthLabel})</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatRupees(healthData.totalIncome)}</p>
          </div>

          {/* Expenses */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-red-50 rounded-lg">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">Monthly Expenses ({monthLabel})</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatRupees(healthData.totalExpenses)}</p>
          </div>

          {/* Savings */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-50 rounded-lg">
                <PiggyBank className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">Net Savings</p>
            <p className={`text-2xl font-bold mt-1 ${healthData.netSavings >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
              {formatRupees(healthData.netSavings)}
            </p>
          </div>

          {/* Savings Rate */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Activity className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">Savings Rate</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{healthData.savingsRate.toFixed(1)}%</p>
          </div>
        </div>

        {/* Insights and Recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Savings Advice */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Savings Analysis</h3>
            <div className="flex items-start space-x-3">
              <savingsAdvice.icon className={`w-5 h-5 mt-0.5 ${savingsAdvice.color}`} />
              <div>
                <p className="text-gray-800">{savingsAdvice.advice}</p>
                <p className="text-sm text-gray-600 mt-2">
                  Current rate: {healthData.savingsRate.toFixed(1)}% | Target: 20%
                </p>
              </div>
            </div>
          </div>

          {/* Goals and Deadlines */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Goals & Deadlines</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Target className="w-5 h-5 text-blue-600" />
                  <span className="text-gray-800">Active Goals</span>
                </div>
                <span className="font-semibold text-gray-900">{healthData.activeGoals}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-orange-600" />
                  <span className="text-gray-800">Upcoming Deadlines</span>
                </div>
                <span className="font-semibold text-gray-900">{healthData.upcomingDeadlines}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          {healthData.recentTransactions.length > 0 ? (
            <div className="space-y-3">
              {healthData.recentTransactions.slice(0, 5).map((transaction, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${transaction.type === 'income' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <div>
                      <p className="font-medium text-gray-900">{transaction.title}</p>
                      <p className="text-sm text-gray-600">{transaction.category} • {transaction.date}</p>
                    </div>
                  </div>
                  <p className={`font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {formatRupees(transaction.amount)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No recent transactions to display.</p>
          )}
        </div>
    </div>
  );
}
