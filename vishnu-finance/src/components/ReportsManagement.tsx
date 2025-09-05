'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart,
  Calendar,
  Target,
  AlertTriangle,
  RefreshCw,
  Brain,
  Globe,
  Newspaper,
  Search,
  Filter,
  Download,
  Share2,
  Eye,
  EyeOff,
  Settings,
  Lightbulb,
  TrendingUpIcon,
  TrendingDownIcon,
  Minus,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { AIInsight, MarketData, GoalRecommendation, WishlistRecommendation } from '../types';
import { useAuth } from '../hooks/useAuth';

interface ReportsData {
  monthlyTrends: {
    monthlyIncome: { month: string; amount: number }[];
    monthlyExpenses: { month: string; amount: number }[];
    monthlySavings: { month: string; amount: number }[];
  };
  categoryBreakdown: { category: string; amount: number; percentage: number }[];
  goalProgress: { goal: string; current: number; target: number; percentage: number }[];
  wishlistAnalysis: {
    totalItems: number;
    completedItems: number;
    totalCost: number;
    priorityBreakdown: Record<string, number>;
  };
  dashboardMetrics: {
    totalIncome: number;
    totalExpenses: number;
    netSavings: number;
    savingsRate: number;
    upcomingDeadlines: number;
    activeGoals: number;
    wishlistItems: number;
    monthlyTrend: 'increasing' | 'decreasing' | 'stable';
  };
  impactAnalysis: {
    totalMonthlyIncome: number;
    totalMonthlyExpenses: number;
    availableForGoals: number;
    totalGoalTargets: number;
    totalWishlistCost: number;
    goalFundingRatio: number;
    wishlistFundingRatio: number;
    recommendations: string[];
  };
}

export default function ReportsManagement() {
  const [selectedPeriod, setSelectedPeriod] = useState('6');
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<ReportsData | null>(null);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [goalRecommendations, setGoalRecommendations] = useState<GoalRecommendation[]>([]);
  const [wishlistRecommendations, setWishlistRecommendations] = useState<WishlistRecommendation[]>([]);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [isLoadingMarket, setIsLoadingMarket] = useState(false);
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false);
  const [selectedView, setSelectedView] = useState<'overview' | 'trends' | 'insights' | 'market'>('overview');
  const [userId] = useState('demo-user-id');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  useEffect(() => {
    fetchReportsData();
  }, [selectedPeriod]);

  const fetchReportsData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/analytics?userId=${userId}&period=${selectedPeriod}&type=reports`);
      if (response.ok) {
        const reportsData = await response.json();
        setData(reportsData);
      }
    } catch (error) {
      console.error('Error fetching reports data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAIInsights = async () => {
    try {
      setIsLoadingInsights(true);
      const response = await fetch('/api/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          financialData: data,
          period: selectedPeriod
        })
      });
      
      if (response.ok) {
        const insights = await response.json();
        setAiInsights(insights.insights || []);
      }
    } catch (error) {
      console.error('Error fetching AI insights:', error);
    } finally {
      setIsLoadingInsights(false);
    }
  };

  const fetchMarketData = async () => {
    try {
      setIsLoadingMarket(true);
      const response = await fetch(`/api/market-data?userId=${userId}`);
      if (response.ok) {
        const market = await response.json();
        setMarketData(market.data || []);
      }
    } catch (error) {
      console.error('Error fetching market data:', error);
    } finally {
      setIsLoadingMarket(false);
    }
  };

  const fetchGoalRecommendations = async () => {
    try {
      const response = await fetch('/api/goal-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          financialData: data
        })
      });
      
      if (response.ok) {
        const recommendations = await response.json();
        setGoalRecommendations(recommendations.recommendations || []);
      }
    } catch (error) {
      console.error('Error fetching goal recommendations:', error);
    }
  };

  const fetchWishlistRecommendations = async () => {
    try {
      const response = await fetch('/api/wishlist-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          financialData: data
        })
      });
      
      if (response.ok) {
        const recommendations = await response.json();
        setWishlistRecommendations(recommendations.recommendations || []);
      }
    } catch (error) {
      console.error('Error fetching wishlist recommendations:', error);
    }
  };

  const getSavingsRateColor = (rate: number) => {
    if (rate >= 30) return 'text-success';
    if (rate >= 20) return 'text-info';
    if (rate >= 10) return 'text-warning';
    return 'text-error';
  };

  const getSavingsRateIcon = (rate: number) => {
    if (rate >= 30) return <TrendingUp className="w-5 h-5 text-success" />;
    if (rate >= 20) return <TrendingUp className="w-5 h-5 text-info" />;
    if (rate >= 10) return <AlertTriangle className="w-5 h-5 text-warning" />;
    return <TrendingDown className="w-5 h-5 text-error" />;
  };

  const getCategoryColor = (index: number) => {
    const colors = [
      'bg-blue-500', 'bg-red-500', 'bg-green-500', 'bg-yellow-500', 
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500'
    ];
    return colors[index % colors.length];
  };

  const calculateFinancialHealthScore = () => {
    if (!data || !data.dashboardMetrics) return { overall: 0, savings: 0, expenses: 0, goals: 0, deadlines: 0 };
    
    const savingsScore = Math.min(100, Math.max(0, (data.dashboardMetrics.savingsRate || 0) * 3));
    const expenseScore = Math.min(100, Math.max(0, 100 - ((data.dashboardMetrics.totalExpenses || 0) / (data.dashboardMetrics.totalIncome || 1)) * 100));
    const goalScore = Math.min(100, Math.max(0, ((data.dashboardMetrics.activeGoals || 0) / 10) * 100));
    const deadlineScore = Math.min(100, Math.max(0, 100 - ((data.dashboardMetrics.upcomingDeadlines || 0) / 10) * 100));
    const overallScore = Math.round((savingsScore + expenseScore + goalScore + deadlineScore) / 4);
    
    return {
      overall: overallScore,
      savings: Math.round(savingsScore),
      expenses: Math.round(expenseScore),
      goals: Math.round(goalScore),
      deadlines: Math.round(deadlineScore)
    };
  };

  const getTrendIcon = (trend: 'increasing' | 'decreasing' | 'stable') => {
    switch (trend) {
      case 'increasing': return <TrendingUpIcon className="w-4 h-4 text-success" />;
      case 'decreasing': return <TrendingDownIcon className="w-4 h-4 text-error" />;
      default: return <Minus className="w-4 h-4 text-muted" />;
    }
  };

  const getMarketChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUpRight className="w-4 h-4 text-success" />;
    if (change < 0) return <ArrowDownRight className="w-4 h-4 text-error" />;
    return <Minus className="w-4 h-4 text-muted" />;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="minimal-loading"></div>
        <span className="ml-3 text-muted">Loading financial reports...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-16 h-16 text-muted mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-primary mb-2">No data available</h2>
        <p className="text-muted">Start adding your financial data to see comprehensive reports</p>
      </div>
    );
  }

  const healthScore = calculateFinancialHealthScore();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-primary">Financial Reports & Analytics</h2>
          <p className="text-muted">Comprehensive analysis with real-time insights and market data</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={selectedPeriod}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedPeriod(e.target.value)}
            className="minimal-select"
          >
            <option value="3">Last 3 months</option>
            <option value="6">Last 6 months</option>
            <option value="12">Last 12 months</option>
          </select>
          <button
            onClick={fetchReportsData}
            className="minimal-button-secondary flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowAdvancedMetrics(!showAdvancedMetrics)}
            className="minimal-button-secondary flex items-center space-x-2"
          >
            {showAdvancedMetrics ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>Advanced</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="minimal-tabs">
        <button
          onClick={() => setSelectedView('overview')}
          className={`minimal-tab ${selectedView === 'overview' ? 'active' : ''}`}
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          Overview
        </button>
        <button
          onClick={() => setSelectedView('trends')}
          className={`minimal-tab ${selectedView === 'trends' ? 'active' : ''}`}
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          Trends
        </button>
        <button
          onClick={() => setSelectedView('insights')}
          className={`minimal-tab ${selectedView === 'insights' ? 'active' : ''}`}
        >
          <Brain className="w-4 h-4 mr-2" />
          AI Insights
        </button>
        <button
          onClick={() => setSelectedView('market')}
          className={`minimal-tab ${selectedView === 'market' ? 'active' : ''}`}
        >
          <Globe className="w-4 h-4 mr-2" />
          Market Data
        </button>
      </div>

      {/* Overview Tab */}
      {selectedView === 'overview' && (
        <div className="minimal-tab-content">
      {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="minimal-stat">
          <div className="flex items-center justify-between">
            <div>
                  <p className="text-sm font-medium text-muted">Total Income</p>
                  <p className="text-2xl font-bold text-success currency-inr">{formatCurrency(data.dashboardMetrics.totalIncome)}</p>
                </div>
                <div className="minimal-stat-inset">
                  <TrendingUp className="w-6 h-6 text-success" />
                </div>
            </div>
            </div>

            <div className="minimal-stat">
          <div className="flex items-center justify-between">
            <div>
                  <p className="text-sm font-medium text-muted">Total Expenses</p>
                  <p className="text-2xl font-bold text-error currency-inr">{formatCurrency(data.dashboardMetrics.totalExpenses)}</p>
                </div>
                <div className="minimal-stat-inset">
                  <TrendingDown className="w-6 h-6 text-error" />
                </div>
            </div>
            </div>

            <div className="minimal-stat">
          <div className="flex items-center justify-between">
            <div>
                  <p className="text-sm font-medium text-muted">Net Savings</p>
                  <p className="text-2xl font-bold text-info currency-inr">{formatCurrency(data.dashboardMetrics.netSavings)}</p>
                </div>
                <div className="minimal-stat-inset">
                  <DollarSign className="w-6 h-6 text-info" />
                </div>
            </div>
            </div>

            <div className="minimal-stat">
          <div className="flex items-center justify-between">
            <div>
                  <p className="text-sm font-medium text-muted">Savings Rate</p>
              <p className={`text-2xl font-bold ${getSavingsRateColor(data.dashboardMetrics.savingsRate)}`}>
                {data.dashboardMetrics.savingsRate.toFixed(1)}%
              </p>
            </div>
                <div className="minimal-stat-inset">
              {getSavingsRateIcon(data.dashboardMetrics.savingsRate)}
                </div>
              </div>
            </div>
          </div>

          {/* Financial Health Score */}
          <div className="minimal-card p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-primary">Financial Health Score</h3>
              <div className="minimal-stat-inset">
                <Target className="w-5 h-5 text-primary" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="minimal-stat-inset p-4 mb-3">
                  <div className="text-3xl font-bold text-primary">{healthScore.overall}</div>
                </div>
                <p className="text-sm font-medium text-primary">Overall Score</p>
                <p className="text-xs text-muted">
                  {healthScore.overall >= 80 ? 'Excellent' : 
                   healthScore.overall >= 60 ? 'Good' : 
                   healthScore.overall >= 40 ? 'Fair' : 'Needs Improvement'}
                </p>
              </div>
              
              <div className="text-center">
                <div className="minimal-stat-inset p-4 mb-3">
                  <div className="text-3xl font-bold text-success">{healthScore.savings}</div>
                </div>
                <p className="text-sm font-medium text-primary">Savings Rate</p>
                <p className="text-xs text-muted">
                  {healthScore.savings >= 80 ? 'Excellent' : 
                   healthScore.savings >= 60 ? 'Good' : 
                   healthScore.savings >= 40 ? 'Fair' : 'Needs Improvement'}
                </p>
      </div>

              <div className="text-center">
                <div className="minimal-stat-inset p-4 mb-3">
                  <div className="text-3xl font-bold text-warning">{healthScore.expenses}</div>
                </div>
                <p className="text-sm font-medium text-primary">Expense Control</p>
                <p className="text-xs text-muted">
                  {healthScore.expenses >= 80 ? 'Excellent' : 
                   healthScore.expenses >= 60 ? 'Good' : 
                   healthScore.expenses >= 40 ? 'Fair' : 'Needs Improvement'}
                </p>
              </div>

              <div className="text-center">
                <div className="minimal-stat-inset p-4 mb-3">
                  <div className="text-3xl font-bold text-info">{healthScore.goals}</div>
                </div>
                <p className="text-sm font-medium text-primary">Goal Progress</p>
                <p className="text-xs text-muted">
                  {healthScore.goals >= 80 ? 'Excellent' : 
                   healthScore.goals >= 60 ? 'Good' : 
                   healthScore.goals >= 40 ? 'Fair' : 'Needs Improvement'}
                </p>
              </div>

              <div className="text-center">
                <div className="minimal-stat-inset p-4 mb-3">
                  <div className="text-3xl font-bold text-error">{healthScore.deadlines}</div>
                </div>
                <p className="text-sm font-medium text-primary">Deadline Management</p>
                <p className="text-xs text-muted">
                  {healthScore.deadlines >= 80 ? 'Excellent' : 
                   healthScore.deadlines >= 60 ? 'Good' : 
                   healthScore.deadlines >= 40 ? 'Fair' : 'Needs Improvement'}
                </p>
              </div>
            </div>
          </div>

          {/* Activity Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="minimal-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-primary">Goals Progress</h4>
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-3">
                {(data?.goalProgress || []).slice(0, 3).map((goal, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-muted truncate">{goal.goal}</span>
                    <span className="text-sm font-medium">{goal.percentage.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
        </div>
        
            <div className="minimal-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-primary">Upcoming Deadlines</h4>
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-warning mb-2">{data.dashboardMetrics.upcomingDeadlines}</div>
                <p className="text-sm text-muted">Deadlines in next 7 days</p>
              </div>
            </div>

            <div className="minimal-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-primary">Wishlist Items</h4>
                <CheckCircle className="w-5 h-5 text-primary" />
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-info mb-2">{data.wishlistAnalysis.totalItems}</div>
                <p className="text-sm text-muted">Total items in wishlist</p>
              </div>
        </div>
          </div>
        </div>
      )}

      {/* Trends Tab */}
      {selectedView === 'trends' && (
        <div className="minimal-tab-content">
      {/* Monthly Trends */}
          <div className="minimal-card p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-primary">Monthly Trends</h3>
              <div className="minimal-stat-inset">
                <BarChart3 className="w-5 h-5 text-primary" />
          </div>
        </div>
        
        <div className="space-y-4">
          {data.monthlyTrends.monthlyIncome.map((month, index) => {
            const expense = data.monthlyTrends.monthlyExpenses[index];
            const savings = data.monthlyTrends.monthlySavings[index];
            const date = new Date(month.month + '-01');
            const monthName = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            
            return (
                  <div key={index} className="minimal-card-inset p-4">
                    <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                        <div className="minimal-stat-inset p-2">
                          <Calendar className="w-4 h-4 text-info" />
                </div>
                        <span className="font-medium text-primary">{monthName}</span>
              </div>
              <div className="flex items-center space-x-6">
                <div className="text-right">
                          <p className="text-sm text-muted">Income</p>
                          <p className="font-semibold text-success currency-inr">{formatCurrency(month.amount)}</p>
                </div>
                <div className="text-right">
                          <p className="text-sm text-muted">Expenses</p>
                          <p className="font-semibold text-error currency-inr">{formatCurrency(expense?.amount || 0)}</p>
                </div>
                <div className="text-right">
                          <p className="text-sm text-muted">Net</p>
                          <p className={`font-semibold ${savings?.amount >= 0 ? 'text-success' : 'text-error'} currency-inr`}>
                      {formatCurrency(savings?.amount || 0)}
                  </p>
                        </div>
                </div>
              </div>
            </div>
            );
          })}
            </div>
          </div>
          
          {/* Expense Breakdown */}
          <div className="minimal-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-primary">Expense Breakdown</h3>
              <div className="minimal-stat-inset">
                <PieChart className="w-5 h-5 text-primary" />
              </div>
            </div>
            
            <div className="space-y-4">
              {data.categoryBreakdown.map((category, index) => (
                <div key={index} className="minimal-card-inset p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div 
                        className={`w-3 h-3 rounded-full ${getCategoryColor(index)}`}
                      ></div>
                      <span className="font-medium text-primary">{category.category || 'Uncategorized'}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary currency-inr">{formatCurrency(category.amount)}</p>
                      <p className="text-sm text-muted">{category.percentage.toFixed(1)}%</p>
                    </div>
                  </div>
          </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AI Insights Tab */}
      {selectedView === 'insights' && (
        <div className="minimal-tab-content">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Brain className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-primary">AI Financial Insights</h3>
          </div>
            <button 
            onClick={fetchAIInsights} 
              className="minimal-button-primary flex items-center space-x-2"
            disabled={isLoadingInsights}
          >
            {isLoadingInsights ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
                <Lightbulb className="w-4 h-4" />
            )}
              <span>Get Insights</span>
            </button>
      </div>

        {aiInsights.length > 0 ? (
        <div className="space-y-4">
            {aiInsights.map((insight, index) => (
                <div key={index} className="minimal-card-inset p-4">
            <div className="flex items-start space-x-3">
                    <div className="minimal-stat-inset p-2 mt-1">
                    <Newspaper className="w-4 h-4 text-purple-600" />
              </div>
                  <div className="flex-1">
                      <h4 className="font-medium text-primary">{insight.title}</h4>
                      <p className="text-sm text-muted mt-1">{insight.content}</p>
                    <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted">Source: {insight.source}</span>
                        <span className="text-xs px-2 py-1 rounded-full bg-secondary text-primary">
                        {insight.category.charAt(0).toUpperCase() + insight.category.slice(1)}
                      </span>
              </div>
            </div>
          </div>
              </div>
            ))}
              </div>
        ) : (
          <div className="text-center py-8">
              <Brain className="w-12 h-12 text-muted mx-auto mb-4" />
              <p className="text-muted">Click "Get Insights" to receive AI-powered financial recommendations</p>
            </div>
        )}

          {/* Goal Recommendations */}
          <div className="minimal-card p-6 mt-6">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-lg font-semibold text-primary">Goal Recommendations</h4>
              <button 
                onClick={fetchGoalRecommendations}
                className="minimal-button-secondary"
              >
                <Target className="w-4 h-4 mr-2" />
                Get Recommendations
              </button>
            </div>
            
            {goalRecommendations.length > 0 ? (
        <div className="space-y-4">
                {goalRecommendations.map((rec, index) => (
                  <div key={index} className="minimal-card-inset p-4">
                    <h5 className="font-medium text-primary mb-2">{rec.title}</h5>
                    <p className="text-sm text-muted mb-3">{rec.recommendation}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-success font-medium currency-inr">
                        Save {formatCurrency(rec.estimatedSavings)}
                      </span>
                      <span className="text-muted">{rec.timeframe}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-center py-4">No goal recommendations available</p>
            )}
          </div>
              </div>
      )}

      {/* Market Data Tab */}
      {selectedView === 'market' && (
        <div className="minimal-tab-content">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <Globe className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-primary">Real-time Market Data</h3>
            </div>
            <button 
              onClick={fetchMarketData}
              className="minimal-button-primary flex items-center space-x-2"
              disabled={isLoadingMarket}
            >
              {isLoadingMarket ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Globe className="w-4 h-4" />
              )}
              <span>Refresh Data</span>
            </button>
          </div>

          {marketData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {marketData.map((item, index) => (
                <div key={index} className="minimal-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-primary">{item.symbol}</h4>
                    {getMarketChangeIcon(item.change)}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted">Price</span>
                      <span className="font-medium currency-inr">₹{item.price.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted">Change</span>
                      <span className={`font-medium ${item.change >= 0 ? 'text-success' : 'text-error'}`}>
                        {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
                      </span>
                    </div>
                    {item.marketCap && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted">Market Cap</span>
                        <span className="font-medium currency-inr">₹{item.marketCap.toLocaleString()}</span>
                      </div>
                    )}
            </div>
          </div>
          ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Globe className="w-12 h-12 text-muted mx-auto mb-4" />
              <p className="text-muted">Click "Refresh Data" to get real-time market information</p>
            </div>
          )}

          {/* Wishlist Recommendations */}
          <div className="minimal-card p-6 mt-6">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-lg font-semibold text-primary">Wishlist Price Tracking</h4>
              <button 
                onClick={fetchWishlistRecommendations}
                className="minimal-button-secondary"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Track Prices
              </button>
            </div>
            
            {wishlistRecommendations.length > 0 ? (
              <div className="space-y-4">
                {wishlistRecommendations.map((rec, index) => (
                  <div key={index} className="minimal-card-inset p-4">
                    <h5 className="font-medium text-primary mb-2">{rec.title}</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted">Current Price:</span>
                        <p className="font-medium currency-inr">₹{rec.currentPrice.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-muted">Best Time to Buy:</span>
                        <p className="font-medium">{rec.bestTimeToBuy}</p>
                      </div>
                      <div>
                        <span className="text-muted">Prediction:</span>
                        <p className="font-medium">{rec.pricePrediction}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-center py-4">No wishlist price tracking available</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

