'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Activity,
  RefreshCw,
  PiggyBank,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowUpRight,
  ArrowDownRight,
  PieChart
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { formatRupees } from '../lib/utils';
// Removed unused imports
// Removed unused import
import Link from 'next/link';

type TabType = 'overview' | 'reports' | 'ai' | 'education' | 'health' | 'insights' | 'milestones';

export default function CreativeDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [dashboardData, setDashboardData] = useState<RealDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weatherEmoji, setWeatherEmoji] = useState('☀️');

  // Update time and weather emoji
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      // Change weather emoji based on time
      const hour = new Date().getHours();
      if (hour >= 6 && hour < 12) setWeatherEmoji('🌅');
      else if (hour >= 12 && hour < 18) setWeatherEmoji('☀️');
      else if (hour >= 18 && hour < 22) setWeatherEmoji('🌇');
      else setWeatherEmoji('🌙');
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Load real data
  useEffect(() => {
    if (user && !authLoading) {
      loadDashboardData();
    }
  }, [user, authLoading]);

  const loadDashboardData = async () => {
    if (!user) {
      console.log('No authenticated user found - please login first');
      return;
    }
    
    try {
      setLoading(true);
      console.log('🔄 Loading REAL dashboard data for authenticated user:', {
        id: user.id,
        email: user.email,
        name: user.name
      });
      
      const response = await fetch(`/api/dashboard-simple?userId=${user.id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ API Error:', errorData);
        throw new Error(`API Error: ${errorData.error || 'Failed to fetch dashboard data'}`);
      }
      
      const data = await response.json();
      console.log('🎉 REAL Dashboard data loaded successfully for', user.name || user.email, ':', {
        totalIncome: data.totalIncome,
        totalExpenses: data.totalExpenses,
        netSavings: data.netSavings,
        transactionsCount: data.recentTransactions.length,
        goalsCount: data.activeGoals,
        healthScore: data.financialHealthScore
      });
      setDashboardData(data);
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      // Fallback to empty data if real data fails
      const fallbackData: RealDashboardData = {
        totalIncome: 0,
        totalExpenses: 0,
        netSavings: 0,
        savingsRate: 0,
        upcomingDeadlines: 0,
        activeGoals: 0,
        recentTransactions: [],
        monthlyTrends: [],
        categoryBreakdown: [],
        financialHealthScore: 0,
        emergencyFundMonths: 0,
        debtToIncomeRatio: 0,
        userPersona: 'casual-budgeter',
        personalizedInsights: ['Welcome! Start by adding your first income and expense to see your financial overview!'],
        behavioralAlerts: [],
        dailyTip: FinancialEducation.getTipOfTheDay(),
        spendingPatterns: {
          totalTransactions: 0,
          averageTransaction: 0,
          mostExpensiveCategory: 'Other',
          spendingTrend: 'stable',
          topCategories: []
        },
        goalProgress: [],
        upcomingBills: [],
        financialMilestones: []
      };
      setDashboardData(fallbackData);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboardData();
    setIsRefreshing(false);
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 75) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (score >= 40) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getPersonaColor = (persona: string) => {
    const colors = {
      'casual-budgeter': 'bg-green-100 text-green-800 border-green-200',
      'freelancer-gig-worker': 'bg-blue-100 text-blue-800 border-blue-200',
      'young-professional': 'bg-purple-100 text-purple-800 border-purple-200',
      'financial-advisor': 'bg-orange-100 text-orange-800 border-orange-200'
    };
    return colors[persona as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getPersonaEmoji = (persona: string) => {
    const emojis = {
      'casual-budgeter': '🎯',
      'freelancer-gig-worker': '💼',
      'young-professional': '🚀',
      'financial-advisor': '👔'
    };
    return emojis[persona as keyof typeof emojis] || '👤';
  };

  const getMotivationalMessage = () => {
    const hour = currentTime.getHours();
    const messages = {
      morning: [
        "Good morning! Ready to conquer your financial goals today? 🌅",
        "Rise and shine! Your financial future is looking bright! ☀️",
        "Morning! Time to make your money work for you! 💰"
      ],
      afternoon: [
        "Afternoon! How's your financial progress going? 🌞",
        "Keep up the great work with your financial goals! 💪",
        "You're doing amazing! Keep building that wealth! 🏆"
      ],
      evening: [
        "Evening! Time to review your financial wins! 🌇",
        "Great job today! Your financial health is improving! 📈",
        "Ending the day strong! Your future self will thank you! 🌟"
      ],
      night: [
        "Good evening! Your financial discipline is paying off! 🌙",
        "Rest well knowing you're building a secure future! 💤",
        "Sweet dreams of financial freedom! 🌠"
      ]
    };

    let timeOfDay = 'morning';
    if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
    else if (hour >= 21 || hour < 6) timeOfDay = 'night';

    const timeMessages = messages[timeOfDay as keyof typeof messages];
    return timeMessages[Math.floor(Math.random() * timeMessages.length)];
  };

  const getAchievementEmoji = (score: number) => {
    if (score >= 90) return '🏆';
    if (score >= 75) return '🥇';
    if (score >= 60) return '🥈';
    if (score >= 40) return '🥉';
    return '🎯';
  };

  const getSpendingEmoji = (category: string) => {
    const emojis: Record<string, string> = {
      'Food': '🍕',
      'Transport': '🚗',
      'Entertainment': '🎬',
      'Housing': '🏠',
      'Utilities': '⚡',
      'Healthcare': '🏥',
      'Education': '📚',
      'Shopping': '🛍️',
      'Travel': '✈️',
      'Other': '📦'
    };
    return emojis[category] || '💰';
  };

  // Show authentication loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 pt-16">
        <div className="max-w-7xl mx-auto p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Authenticating...</h3>
            <p className="text-gray-600">Please wait while we verify your identity</p>
          </div>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 pt-16">
        <div className="max-w-7xl mx-auto p-6">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl">🔐</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Please Login to Continue</h3>
            <p className="text-gray-600 mb-8">You need to be logged in to view your financial dashboard</p>
            <Link 
              href="/login" 
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 pt-16">
        <div className="max-w-7xl mx-auto p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 pt-16">
        <div className="max-w-7xl mx-auto p-6">
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
            <p className="text-gray-600">Unable to load dashboard data. Please try again.</p>
            <button
              onClick={handleRefresh}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 pt-16">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Creative Header with Time and Weather */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-2xl">{weatherEmoji}</span>
              <h1 className="text-3xl font-bold text-gray-900">
                {getMotivationalMessage()}
              </h1>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>👋 {user?.name || 'User'}</span>
              <span>•</span>
              <span>🕐 {currentTime.toLocaleTimeString()}</span>
              <span>•</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPersonaColor(dashboardData.userPersona)}`}>
                {getPersonaEmoji(dashboardData.userPersona)} {PersonaService.getPersona(dashboardData.userPersona)?.name || 'User'}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center space-x-2 px-4 py-2 bg-white/80 backdrop-blur-sm hover:bg-white text-gray-700 rounded-lg transition-all duration-300 shadow-sm hover:shadow-md"
            >
              {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{showDetails ? 'Hide Details' : 'Show Details'}</span>
            </button>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-300 shadow-sm hover:shadow-md disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Behavioral Alerts with Creative Design */}
        {dashboardData.behavioralAlerts.length > 0 && (
          <div className="space-y-3">
            {dashboardData.behavioralAlerts.map((alert, index) => (
              <div key={index} className={`p-4 rounded-xl border-2 backdrop-blur-sm ${
                alert.type === 'error' ? 'bg-red-50/80 border-red-200' :
                alert.type === 'warning' ? 'bg-yellow-50/80 border-yellow-200' :
                'bg-blue-50/80 border-blue-200'
              }`}>
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">
                    {alert.type === 'error' ? '🚨' : alert.type === 'warning' ? '⚠️' : '💡'}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{alert.message}</h4>
                    {alert.urgency === 'high' && (
                      <p className="text-sm text-gray-600 mt-1">This requires immediate attention!</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Creative Tab Navigation */}
        <div className="flex space-x-1 bg-white/80 backdrop-blur-sm rounded-xl p-1 shadow-sm">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3, emoji: '📊' },
            { id: 'insights', label: 'Insights', icon: Brain, emoji: '🧠' },
            { id: 'milestones', label: 'Milestones', icon: Trophy, emoji: '🏆' },
            { id: 'reports', label: 'Reports', icon: PieChart, emoji: '📈' },
            { id: 'ai', label: 'AI Insights', icon: Sparkles, emoji: '✨' },
            { id: 'education', label: 'Learn', icon: BookOpen, emoji: '📚' },
            { id: 'health', label: 'Health Score', icon: Heart, emoji: '💖' }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                <span className="text-lg">{tab.emoji}</span>
                <Icon className="w-4 h-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Creative Key Metrics with Emojis */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 group border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Income</p>
                      <p className="text-2xl font-bold text-gray-800">{formatRupees(dashboardData.totalIncome)}</p>
                      <p className="text-sm text-gray-500 flex items-center space-x-1">
                        <ArrowUpRight className="w-3 h-3" />
                        <span>This month</span>
                      </p>
                    </div>
                    <div className="text-2xl text-gray-400 group-hover:text-gray-600 transition-colors duration-300">
                      <TrendingUp className="w-8 h-8" />
                    </div>
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 group border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                      <p className="text-2xl font-bold text-gray-800">{formatRupees(dashboardData.totalExpenses)}</p>
                      <p className="text-sm text-gray-500 flex items-center space-x-1">
                        <ArrowDownRight className="w-3 h-3" />
                        <span>This month</span>
                      </p>
                    </div>
                    <div className="text-2xl text-gray-400 group-hover:text-gray-600 transition-colors duration-300">
                      <TrendingDown className="w-8 h-8" />
                    </div>
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 group border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Net Savings</p>
                      <p className={`text-2xl font-bold ${dashboardData.netSavings >= 0 ? 'text-gray-800' : 'text-gray-600'}`}>
                        {formatRupees(dashboardData.netSavings)}
                      </p>
                      <p className="text-sm text-gray-500 flex items-center space-x-1">
                        <PiggyBank className="w-3 h-3" />
                        <span>{dashboardData.savingsRate.toFixed(1)}% savings rate</span>
                      </p>
                    </div>
                    <div className="text-2xl text-gray-400 group-hover:text-gray-600 transition-colors duration-300">
                      <PiggyBank className="w-8 h-8" />
                    </div>
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 group border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Financial Health</p>
                      <p className="text-2xl font-bold text-gray-800">{dashboardData.financialHealthScore}/100</p>
                      <p className="text-sm text-gray-500 flex items-center space-x-1">
                        <Activity className="w-3 h-3" />
                        <span>Health Score</span>
                      </p>
                    </div>
                    <div className="text-2xl text-gray-400 group-hover:text-gray-600 transition-colors duration-300">
                      <Activity className="w-8 h-8" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Creative Financial Health Score Card */}
              <div className="bg-gradient-to-r from-blue-50/80 to-green-50/80 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-blue-200/50">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center space-x-2">
                      <span className="text-2xl">{getAchievementEmoji(dashboardData.financialHealthScore)}</span>
                      <span>Financial Health Score</span>
                    </h3>
                    <p className="text-gray-600">Based on your real financial data and habits</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-3xl font-bold ${getHealthScoreColor(dashboardData.financialHealthScore).split(' ')[0]}`}>
                      {dashboardData.financialHealthScore}/100
                    </div>
                    <div className={`text-sm font-medium ${getHealthScoreColor(dashboardData.financialHealthScore).split(' ')[0]}`}>
                      {dashboardData.financialHealthScore >= 75 ? 'EXCELLENT' : 
                       dashboardData.financialHealthScore >= 60 ? 'GOOD' : 
                       dashboardData.financialHealthScore >= 40 ? 'FAIR' : 'NEEDS IMPROVEMENT'}
                    </div>
                  </div>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
                  <div 
                    className={`h-4 rounded-full transition-all duration-1000 ${
                      dashboardData.financialHealthScore >= 75 ? 'bg-gradient-to-r from-green-400 to-green-600' : 
                      dashboardData.financialHealthScore >= 60 ? 'bg-gradient-to-r from-blue-400 to-blue-600' : 
                      dashboardData.financialHealthScore >= 40 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 'bg-gradient-to-r from-red-400 to-red-600'
                    }`}
                    style={{ width: `${dashboardData.financialHealthScore}%` }}
                  ></div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">{dashboardData.savingsRate}%</div>
                    <div className="text-sm text-gray-600">💾 Savings Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">{dashboardData.debtToIncomeRatio}%</div>
                    <div className="text-sm text-gray-600">📊 Debt-to-Income</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">{dashboardData.emergencyFundMonths.toFixed(1)}m</div>
                    <div className="text-sm text-gray-600">🆘 Emergency Fund</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">{dashboardData.activeGoals}</div>
                    <div className="text-sm text-gray-600">🎯 Active Goals</div>
                  </div>
                </div>
              </div>

              {/* Creative Daily Tip Card */}
              {dashboardData.dailyTip && (
                <div className="bg-gradient-to-r from-yellow-50/80 to-orange-50/80 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-yellow-200/50">
                  <div className="flex items-start space-x-4">
                    <div className="text-4xl">💡</div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Daily Financial Tip</h3>
                      <h4 className="font-medium text-gray-900 mb-2">{dashboardData.dailyTip.title}</h4>
                      <p className="text-gray-700 mb-3">{dashboardData.dailyTip.description}</p>
                      <div className="flex items-center space-x-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                          dashboardData.dailyTip.difficulty === 'beginner' ? 'bg-green-100 text-green-800 border-green-200' :
                          dashboardData.dailyTip.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                          'bg-red-100 text-red-800 border-red-200'
                        }`}>
                          {dashboardData.dailyTip.difficulty}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                          dashboardData.dailyTip.impact === 'high' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                          dashboardData.dailyTip.impact === 'medium' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                          'bg-gray-100 text-gray-800 border-gray-200'
                        }`}>
                          {dashboardData.dailyTip.impact} impact
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Creative Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link href="/income" className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md flex items-center justify-center space-x-2">
                  <span className="text-xl">💰</span>
                  <span>Add Income</span>
                </Link>
                <Link href="/expenses" className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md flex items-center justify-center space-x-2">
                  <span className="text-xl">💸</span>
                  <span>Add Expense</span>
                </Link>
                <Link href="/goals" className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md flex items-center justify-center space-x-2">
                  <span className="text-xl">🎯</span>
                  <span>Set Goal</span>
                </Link>
                <Link href="/education" className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md flex items-center justify-center space-x-2">
                  <span className="text-xl">📚</span>
                  <span>Learn More</span>
                </Link>
              </div>
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="space-y-6">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                  <span className="text-2xl">🧠</span>
                  <span>Personalized Insights</span>
                </h3>
                <div className="space-y-3">
                  {dashboardData.personalizedInsights.map((insight, index) => (
                    <div key={index} className="p-3 bg-blue-50/80 rounded-lg border border-blue-200/50">
                      <p className="text-gray-700">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                  <span className="text-2xl">📊</span>
                  <span>Spending Patterns</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50/80 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{dashboardData.spendingPatterns.totalTransactions}</div>
                    <div className="text-sm text-gray-600">Total Transactions</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50/80 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{formatRupees(dashboardData.spendingPatterns.averageTransaction)}</div>
                    <div className="text-sm text-gray-600">Average Transaction</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50/80 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{getSpendingEmoji(dashboardData.spendingPatterns.mostExpensiveCategory)}</div>
                    <div className="text-sm text-gray-600">Top Category</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'milestones' && (
            <div className="space-y-6">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                  <span className="text-2xl">🏆</span>
                  <span>Financial Milestones</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dashboardData.financialMilestones.map((milestone, index) => (
                    <div key={index} className={`p-4 rounded-lg border-2 ${
                      milestone.achieved ? 'bg-green-50/80 border-green-200' : 'bg-gray-50/80 border-gray-200'
                    }`}>
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{milestone.icon}</span>
                        <div>
                          <h4 className="font-medium text-gray-900">{milestone.title}</h4>
                          <p className="text-sm text-gray-600">{milestone.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'education' && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Financial Education</h3>
              <p className="text-gray-600 mb-6">Learn essential financial concepts and get personalized tips</p>
              <Link href="/education" className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md inline-flex items-center space-x-2">
                <span className="text-xl">📚</span>
                <span>Start Learning</span>
              </Link>
            </div>
          )}

          {activeTab === 'health' && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💖</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Financial Health Dashboard</h3>
              <p className="text-gray-600 mb-6">Get detailed insights into your financial wellness</p>
              <Link href="/financial-health" className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md inline-flex items-center space-x-2">
                <span className="text-xl">💖</span>
                <span>View Health Score</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
