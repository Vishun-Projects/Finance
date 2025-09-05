'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  BarChart3, 
  Clock, 
  LineChart,
  Activity,
  RefreshCw,
  Plus,
  PiggyBank,
  AlertCircle,
  DollarSign,
  Calendar,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  AlertTriangle,
  PieChart,
  Download,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { formatRupees } from '../../../lib/utils';
import AIFinancialAssistant from '../../../components/AIFinancialAssistant';

interface DashboardData {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number;
  upcomingDeadlines: number;
  activeGoals: number;
  recentTransactions: any[];
  monthlyTrends: any[];
  categoryBreakdown: any[];
}

type TabType = 'overview' | 'reports' | 'ai';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('6');
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false);

  useEffect(() => {
    if (user && !authLoading) {
      fetchDashboardData();
    }
  }, [user, authLoading, selectedPeriod]);

  const fetchDashboardData = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch data from multiple endpoints for comprehensive dashboard
      const [analyticsResponse, incomeResponse, expensesResponse, goalsResponse, deadlinesResponse] = await Promise.all([
        fetch(`/api/analytics?userId=${user.id}`),
        fetch(`/api/income?userId=${user.id}`),
        fetch(`/api/expenses?userId=${user.id}`),
        fetch(`/api/goals?userId=${user.id}`),
        fetch(`/api/deadlines?userId=${user.id}`)
      ]);

      // Process analytics data
      let analyticsData = null;
      if (analyticsResponse.ok) {
        analyticsData = await analyticsResponse.json();
      }

      // Process income data
      let incomeData = [];
      if (incomeResponse.ok) {
        const income = await incomeResponse.json();
        incomeData = income.map((item: any) => ({
          id: item.id,
          title: item.name || 'Income',
          amount: parseFloat(item.amount),
          category: 'Income',
          date: item.startDate,
          type: 'income'
        }));
      }

      // Process expenses data
      let expensesData = [];
      if (expensesResponse.ok) {
        const expenses = await expensesResponse.json();
        expensesData = expenses.map((item: any) => ({
          id: item.id,
          title: item.description || 'Expense',
          amount: parseFloat(item.amount),
          category: 'Expense',
          date: item.date,
          type: 'expense'
        }));
      }

      // Process goals data
      let goalsData = [];
      if (goalsResponse.ok) {
        const goals = await goalsResponse.json();
        goalsData = goals;
      }

      // Process deadlines data
      let deadlinesData = [];
      if (deadlinesResponse.ok) {
        const deadlines = await deadlinesResponse.json();
        deadlinesData = deadlines;
      }

      // Calculate dashboard metrics
      const totalIncome = incomeData.reduce((sum: number, item: any) => sum + item.amount, 0);
      const totalExpenses = expensesData.reduce((sum: number, item: any) => sum + item.amount, 0);
      const netSavings = totalIncome - totalExpenses;
      const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
      const activeGoals = goalsData.length;
      const upcomingDeadlines = deadlinesData.filter((d: any) => new Date(d.dueDate) > new Date()).length;

      // Combine recent transactions
      const recentTransactions = [...incomeData, ...expensesData]
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      // Create monthly trends (last 6 months) - Only show months with data
      const monthlyTrends = [];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      for (let i = 0; i < 6; i++) {
        const monthIncome = incomeData.filter((item: any) => {
          const itemDate = new Date(item.date);
          const month = itemDate.getMonth();
          return month === i;
        }).reduce((sum: number, item: any) => sum + item.amount, 0);

        const monthExpenses = expensesData.filter((item: any) => {
          const itemDate = new Date(item.date);
          const month = itemDate.getMonth();
          return month === i;
        }).reduce((sum: number, item: any) => sum + item.amount, 0);

        const monthSavings = monthIncome - monthExpenses;

        // Only add month if there's actual data
        if (monthIncome > 0 || monthExpenses > 0) {
          monthlyTrends.push({
            month: months[i],
            income: monthIncome,
            expenses: monthExpenses,
            savings: monthSavings
          });
        }
      }

      // Create category breakdown
      const categoryBreakdown = expensesData.reduce((acc: any, item: any) => {
        const category = item.category || 'Other';
        if (!acc[category]) acc[category] = 0;
        acc[category] += item.amount;
        return acc;
      }, {});

      const categoryData = Object.entries(categoryBreakdown).map(([category, amount]) => ({
        category,
        amount: amount as number,
        percentage: (amount as number / totalExpenses) * 100
      }));

      const dashboardData = {
        totalIncome,
        totalExpenses,
        netSavings,
        savingsRate,
        upcomingDeadlines,
        activeGoals,
        recentTransactions,
        monthlyTrends,
        categoryBreakdown: categoryData
      };
      
      setDashboardData(dashboardData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in p-6">
        {/* Header Skeleton */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="animate-pulse">
            <div className="h-10 bg-muted rounded w-72 mb-3"></div>
            <div className="h-5 bg-muted rounded w-96"></div>
          </div>
          <div className="flex space-x-4">
            <div className="h-12 bg-muted rounded w-28 animate-pulse"></div>
            <div className="h-12 bg-muted rounded w-36 animate-pulse"></div>
          </div>
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-6 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-24 mb-3"></div>
                  <div className="h-8 bg-muted rounded w-32"></div>
                </div>
                <div className="w-14 h-14 bg-muted rounded-xl"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-card border border-border rounded-xl p-6 animate-pulse">
            <div className="h-7 bg-muted rounded w-48 mb-6"></div>
            <div className="h-80 bg-muted rounded-xl"></div>
          </div>
          <div className="bg-card border border-border rounded-xl p-6 animate-pulse">
            <div className="h-7 bg-muted rounded w-48 mb-6"></div>
            <div className="h-80 bg-muted rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 px-6">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10 text-destructive" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-3">Error Loading Dashboard</h2>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">{error}</p>
        <button 
          onClick={fetchDashboardData}
          className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 mx-auto"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Try Again</span>
        </button>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-16 px-6">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
          <BarChart3 className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-3">No Data Available</h2>
        <p className="text-muted-foreground mb-6">Start adding your financial data to see the dashboard</p>
        <button className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-lg font-medium transition-colors">
          Add First Transaction
        </button>
      </div>
    );
  }

  const renderOverviewTab = () => (
    <div className="space-y-8">
      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Income - Green for positive money */}
        <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center">
              <TrendingUp size={24} className="text-success" />
            </div>
            <ArrowUpRight size={20} className="text-success" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Total Income</p>
            <p className="text-2xl font-bold text-foreground">{formatRupees(dashboardData.totalIncome)}</p>
          </div>
        </div>

        {/* Total Expenses - Red for money going out */}
        <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-destructive/10 rounded-xl flex items-center justify-center">
              <TrendingDown size={24} className="text-destructive" />
            </div>
            <ArrowDownRight size={20} className="text-destructive" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Total Expenses</p>
            <p className="text-2xl font-bold text-foreground">{formatRupees(dashboardData.totalExpenses)}</p>
          </div>
        </div>

        {/* Net Savings - Blue for neutral/positive */}
        <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-info/10 rounded-xl flex items-center justify-center">
              <PiggyBank size={24} className="text-info" />
            </div>
            <div className={`text-right ${dashboardData.netSavings >= 0 ? 'text-success' : 'text-destructive'}`}>
              {dashboardData.netSavings >= 0 ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Net Savings</p>
            <p className={`text-2xl font-bold ${dashboardData.netSavings >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatRupees(dashboardData.netSavings)}
            </p>
          </div>
        </div>

        {/* Savings Rate - Primary color for key metric */}
        <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Target size={24} className="text-primary" />
            </div>
            <div className="text-right">
              <span className="text-sm font-medium text-muted-foreground">Rate</span>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Savings Rate</p>
            <p className="text-2xl font-bold text-foreground">{(dashboardData.savingsRate || 0).toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Quick Actions & Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Upcoming Deadlines - Warning color for attention */}
        <div className="bg-card border border-border rounded-xl p-6 text-center hover:shadow-lg transition-all duration-300 cursor-pointer group">
          <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
            <Clock size={32} className="text-warning" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">{dashboardData.upcomingDeadlines}</h3>
          <p className="text-muted-foreground">Upcoming Deadlines</p>
          {dashboardData.upcomingDeadlines > 0 && (
            <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Action Required
            </div>
          )}
        </div>

        {/* Active Goals - Success color for positive progress */}
        <div className="bg-card border border-border rounded-xl p-6 text-center hover:shadow-lg transition-all duration-300 cursor-pointer group">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
            <Target size={32} className="text-success" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">{dashboardData.activeGoals}</h3>
          <p className="text-muted-foreground">Active Goals</p>
          {dashboardData.activeGoals > 0 && (
            <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
              <CheckCircle className="w-3 h-3 mr-1" />
              In Progress
            </div>
          )}
        </div>

        {/* Budget Review - Info color for neutral action */}
        <div className="bg-card border border-border rounded-xl p-6 text-center hover:shadow-lg transition-all duration-300 cursor-pointer group">
          <div className="w-16 h-16 bg-info/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
            <Eye size={32} className="text-info" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Budget</h3>
          <p className="text-muted-foreground">Review Spending</p>
          <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-info/10 text-info">
            <BarChart3 className="w-3 h-3 mr-1" />
            Analyze
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Trends Chart - Only show if there's data */}
        {dashboardData.monthlyTrends.length > 0 ? (
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-foreground">Monthly Trends</h3>
              <LineChart size={24} className="text-primary" />
            </div>
            <div className="space-y-3">
              {dashboardData.monthlyTrends.map((trend, index) => (
                <div key={index} className="bg-muted/30 border border-border rounded-lg p-4 hover:bg-muted transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-foreground">{trend.month}</span>
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-success font-medium">₹{trend.income.toLocaleString()}</span>
                      <span className="text-destructive font-medium">₹{trend.expenses.toLocaleString()}</span>
                      <span className="text-info font-medium">₹{trend.savings.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="w-full bg-border rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(0, (trend.savings / Math.max(trend.income, 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-foreground">Monthly Trends</h3>
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div className="text-center py-8">
              <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No monthly data available yet</p>
              <p className="text-sm text-muted-foreground">Add transactions to see trends</p>
            </div>
          </div>
        )}

        {/* Recent Transactions */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-foreground">Recent Transactions</h3>
            <button className="text-primary hover:text-primary/80 transition-colors">
              <Activity size={20} />
            </button>
          </div>
          <div className="space-y-3">
            {dashboardData.recentTransactions.map((transaction) => (
              <div key={transaction.id} className="bg-muted/30 border border-border rounded-lg p-4 hover:bg-muted transition-colors">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    transaction.type === 'income' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                  }`}>
                    {transaction.type === 'income' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{transaction.title}</p>
                    <p className="text-sm text-muted-foreground">{transaction.category} • {new Date(transaction.date).toLocaleDateString()}</p>
                  </div>
                  <span className={`font-bold text-lg ${
                    transaction.type === 'income' ? 'text-success' : 'text-destructive'
                  }`}>
                    {transaction.type === 'income' ? '+' : '-'}{formatRupees(transaction.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Financial Summary Grid */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-xl font-bold text-foreground mb-6">Financial Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-success/5 rounded-lg border border-success/20">
            <div className="text-3xl font-bold text-success mb-2">₹{dashboardData.netSavings.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground">Total Savings</p>
          </div>
          <div className="text-center p-4 bg-info/5 rounded-lg border border-info/20">
            <div className="text-3xl font-bold text-info mb-2">{dashboardData.savingsRate.toFixed(1)}%</div>
            <p className="text-sm text-muted-foreground">Savings Rate</p>
          </div>
          <div className="text-center p-4 bg-warning/5 rounded-lg border border-warning/20">
            <div className="text-3xl font-bold text-warning mb-2">{dashboardData.upcomingDeadlines}</div>
            <p className="text-sm text-muted-foreground">Upcoming Deadlines</p>
          </div>
          <div className="text-center p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="text-3xl font-bold text-primary mb-2">{dashboardData.activeGoals}</div>
            <p className="text-sm text-muted-foreground">Active Goals</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderReportsTab = () => (
    <div className="space-y-8">
      {/* Reports Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-foreground">Financial Reports</h3>
          <p className="text-muted-foreground">Detailed analysis and insights</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="minimal-select"
          >
            <option value="3">Last 3 Months</option>
            <option value="6">Last 6 Months</option>
            <option value="12">Last 12 Months</option>
          </select>
          <button
            onClick={() => setShowAdvancedMetrics(!showAdvancedMetrics)}
            className="minimal-button-secondary flex items-center space-x-2"
          >
            {showAdvancedMetrics ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{showAdvancedMetrics ? 'Hide' : 'Show'} Advanced</span>
          </button>
          <button className="minimal-button-primary flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Trends Chart - Only show if there's data */}
        {dashboardData.monthlyTrends.length > 0 ? (
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-foreground">Monthly Trends</h3>
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-3">
              {dashboardData.monthlyTrends.map((trend, index) => (
                <div key={index} className="bg-muted/30 border border-border rounded-lg p-4 hover:bg-muted transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-foreground">{trend.month}</span>
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-success font-medium">₹{trend.income.toLocaleString()}</span>
                      <span className="text-destructive font-medium">₹{trend.expenses.toLocaleString()}</span>
                      <span className="text-info font-medium">₹{trend.savings.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="w-full bg-border rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(0, (trend.savings / Math.max(trend.income, 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-foreground">Monthly Trends</h3>
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div className="text-center py-8">
              <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No monthly data available yet</p>
              <p className="text-sm text-muted-foreground">Add transactions to see trends</p>
            </div>
          </div>
        )}

        {/* Category Breakdown - Only show if there are categories */}
        {dashboardData.categoryBreakdown.length > 0 ? (
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-foreground">Expense Categories</h3>
              <PieChart className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-3">
              {dashboardData.categoryBreakdown.map((category, index) => (
                <div key={index} className="flex items-center justify-between p-3 minimal-card-inset">
                  <span className="font-medium text-foreground">{category.category}</span>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-destructive">{formatRupees(category.amount)}</span>
                    <span className="text-muted-foreground">{category.percentage.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-foreground">Expense Categories</h3>
              <PieChart className="w-5 h-5 text-primary" />
            </div>
            <div className="text-center py-8">
              <PieChart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No expense categories available</p>
              <p className="text-sm text-muted-foreground">Add expenses to see category breakdown</p>
            </div>
          </div>
        )}
      </div>

      {/* Additional Metrics */}
      {showAdvancedMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="minimal-card-inset text-center p-6">
            <Target className="w-8 h-8 text-primary mx-auto mb-3" />
            <div className="text-2xl font-bold text-primary">{dashboardData.activeGoals}</div>
            <p className="text-sm text-muted-foreground">Active Goals</p>
          </div>
          <div className="minimal-card-inset text-center p-6">
            <Calendar className="w-8 h-8 text-warning mx-auto mb-3" />
            <div className="text-2xl font-bold text-warning">{dashboardData.upcomingDeadlines}</div>
            <p className="text-sm text-muted-foreground">Upcoming Deadlines</p>
          </div>
          <div className="minimal-card-inset text-center p-6">
            <BarChart3 className="w-8 h-8 text-info mx-auto mb-3" />
            <div className="text-2xl font-bold text-info">{dashboardData.recentTransactions.length}</div>
            <p className="text-sm text-muted-foreground">Total Transactions</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Financial Dashboard</h1>
          <p className="text-lg text-muted-foreground">Welcome back! Here's your financial overview</p>
        </div>
        <div className="flex space-x-4">
          <button 
            onClick={fetchDashboardData}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'overview'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'reports'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            Reports
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'ai'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            AI Assistant
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'reports' && renderReportsTab()}
      {activeTab === 'ai' && <AIFinancialAssistant />}
    </div>
  );
}
