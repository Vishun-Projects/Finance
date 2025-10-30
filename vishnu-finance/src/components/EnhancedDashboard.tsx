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
  EyeOff,
  BarChart,
  Table,
  Heart,
  BookOpen,
  Lightbulb,
  Award,
  Shield,
  Brain,
  Zap,
  Star,
  Users,
  Settings
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { formatRupees } from '../lib/utils';
import { PsychologyUI, FinancialBehaviorTriggers } from '../lib/psychology-ui';
import { FinancialEducation } from '../lib/financial-education';
import { PersonaService } from '../lib/user-personas';
import Link from 'next/link';

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
  financialHealthScore: number;
  creditScore?: number;
  emergencyFundMonths: number;
  debtToIncomeRatio: number;
}

type TabType = 'overview' | 'reports' | 'ai' | 'education' | 'health';

export default function EnhancedDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [userPersona, setUserPersona] = useState<string>('casual-budgeter');
  const [dailyTip, setDailyTip] = useState<any>(null);
  const [behavioralAlerts, setBehavioralAlerts] = useState<any[]>([]);

  // Mock data - in real app, this would come from API
  useEffect(() => {
    const mockData: DashboardData = {
      totalIncome: 75000,
      totalExpenses: 45000,
      netSavings: 30000,
      savingsRate: 40,
      upcomingDeadlines: 3,
      activeGoals: 5,
      recentTransactions: [
        { id: 1, title: 'Salary', amount: 75000, type: 'income', date: '2024-01-01', category: 'Salary' },
        { id: 2, title: 'Rent', amount: -15000, type: 'expense', date: '2024-01-02', category: 'Housing' },
        { id: 3, title: 'Groceries', amount: -5000, type: 'expense', date: '2024-01-03', category: 'Food' },
        { id: 4, title: 'Freelance', amount: 10000, type: 'income', date: '2024-01-04', category: 'Freelance' },
        { id: 5, title: 'Transport', amount: -3000, type: 'expense', date: '2024-01-05', category: 'Transport' }
      ],
      monthlyTrends: [
        { month: 'Jan', income: 75000, expenses: 45000, savings: 30000 },
        { month: 'Feb', income: 78000, expenses: 42000, savings: 36000 },
        { month: 'Mar', income: 82000, expenses: 48000, savings: 34000 },
        { month: 'Apr', income: 79000, expenses: 46000, savings: 33000 },
        { month: 'May', income: 85000, expenses: 44000, savings: 41000 },
        { month: 'Jun', income: 88000, expenses: 47000, savings: 41000 }
      ],
      categoryBreakdown: [
        { category: 'Housing', amount: 15000, percentage: 33, color: '#3B82F6' },
        { category: 'Food', amount: 8000, percentage: 18, color: '#10B981' },
        { category: 'Transport', amount: 6000, percentage: 13, color: '#F59E0B' },
        { category: 'Entertainment', amount: 5000, percentage: 11, color: '#EF4444' },
        { category: 'Utilities', amount: 4000, percentage: 9, color: '#8B5CF6' },
        { category: 'Others', amount: 7000, percentage: 16, color: '#6B7280' }
      ],
      financialHealthScore: 78,
      creditScore: 750,
      emergencyFundMonths: 4.2,
      debtToIncomeRatio: 18
    };

    setTimeout(() => {
      setDashboardData(mockData);
      setLoading(false);
    }, 1000);
  }, []);

  // Get daily tip
  useEffect(() => {
    const tip = FinancialEducation.getTipOfTheDay();
    setDailyTip(tip);
  }, []);

  // Generate behavioral alerts
  useEffect(() => {
    if (dashboardData) {
      const alerts = [];
      
      // Loss aversion alert
      if (dashboardData.savingsRate < 20) {
        alerts.push(FinancialBehaviorTriggers.createLossAversionAlert(50000, '6 months'));
      }
      
      // Scarcity alert
      if (dashboardData.emergencyFundMonths < 6) {
        alerts.push(FinancialBehaviorTriggers.createScarcityAlert(100000, 42000, 'emergency fund'));
      }
      
      // Social proof
      alerts.push(FinancialBehaviorTriggers.createSocialProof(85, 'saving more than 20% of their income'));
      
      setBehavioralAlerts(alerts);
    }
  }, [dashboardData]);

  // Detect user persona
  useEffect(() => {
    if (dashboardData) {
      const behavior = {
        incomePattern: 'regular' as const,
        expenseComplexity: 'moderate' as const,
        goalTypes: ['emergency', 'vacation'],
        featureUsage: ['expense-tracking', 'budget-management'],
        timeSpent: 15
      };
      const detectedPersona = PersonaService.detectPersona(behavior);
      setUserPersona(detectedPersona);
    }
  }, [dashboardData]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16">
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
      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="max-w-7xl mx-auto p-6">
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
            <p className="text-gray-600">Unable to load dashboard data. Please try again.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header with Psychology Elements */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back, {user?.name || 'User'}! 👋
            </h1>
            <p className="text-gray-600">
              Your financial journey is looking great! Here's your personalized overview.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getPersonaColor(userPersona)}`}>
              {PersonaService.getPersona(userPersona)?.name || 'User'}
            </span>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{showDetails ? 'Hide Details' : 'Show Details'}</span>
            </button>
          </div>
        </div>

        {/* Behavioral Alerts */}
        {behavioralAlerts.length > 0 && (
          <div className="space-y-3">
            {behavioralAlerts.map((alert, index) => (
              <div key={index} className={`p-4 rounded-lg border ${alert.style}`}>
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
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

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'reports', label: 'Reports', icon: PieChart },
            { id: 'ai', label: 'AI Insights', icon: Brain },
            { id: 'education', label: 'Learn', icon: BookOpen },
            { id: 'health', label: 'Health Score', icon: Heart }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
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
              {/* Key Metrics with Psychology Design */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className={`${PsychologyUI.financial.getCognitiveLoadReduction().simpleCard} group hover:shadow-lg transition-all duration-300`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Income</p>
                      <p className="text-2xl font-bold text-green-600">{formatRupees(dashboardData.totalIncome)}</p>
                      <p className="text-sm text-green-600 flex items-center space-x-1">
                        <ArrowUpRight className="w-3 h-3" />
                        <span>+12% from last month</span>
                      </p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-full">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>

                <div className={`${PsychologyUI.financial.getCognitiveLoadReduction().simpleCard} group hover:shadow-lg transition-all duration-300`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                      <p className="text-2xl font-bold text-red-600">{formatRupees(dashboardData.totalExpenses)}</p>
                      <p className="text-sm text-red-600 flex items-center space-x-1">
                        <ArrowDownRight className="w-3 h-3" />
                        <span>-8% from last month</span>
                      </p>
                    </div>
                    <div className="p-3 bg-red-100 rounded-full">
                      <TrendingDown className="w-6 h-6 text-red-600" />
                    </div>
                  </div>
                </div>

                <div className={`${PsychologyUI.financial.getCognitiveLoadReduction().simpleCard} group hover:shadow-lg transition-all duration-300`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Net Savings</p>
                      <p className="text-2xl font-bold text-blue-600">{formatRupees(dashboardData.netSavings)}</p>
                      <p className="text-sm text-blue-600 flex items-center space-x-1">
                        <PiggyBank className="w-3 h-3" />
                        <span>{dashboardData.savingsRate}% savings rate</span>
                      </p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-full">
                      <PiggyBank className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className={`${PsychologyUI.financial.getCognitiveLoadReduction().simpleCard} group hover:shadow-lg transition-all duration-300`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Financial Health</p>
                      <p className="text-2xl font-bold text-purple-600">{dashboardData.financialHealthScore}/100</p>
                      <p className="text-sm text-purple-600 flex items-center space-x-1">
                        <Heart className="w-3 h-3" />
                        <span>Good</span>
                      </p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-full">
                      <Heart className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Health Score Card */}
              <div className={`${PsychologyUI.financial.getCognitiveLoadReduction().simpleCard} relative overflow-hidden`}>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-green-50 opacity-50"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Financial Health Score</h3>
                      <p className="text-gray-600">Based on your financial habits and goals</p>
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
                  
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                    <div 
                      className={`h-3 rounded-full transition-all duration-1000 ${
                        dashboardData.financialHealthScore >= 75 ? 'bg-green-500' : 
                        dashboardData.financialHealthScore >= 60 ? 'bg-blue-500' : 
                        dashboardData.financialHealthScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${dashboardData.financialHealthScore}%` }}
                    ></div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">{dashboardData.savingsRate}%</div>
                      <div className="text-sm text-gray-600">Savings Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">{dashboardData.debtToIncomeRatio}%</div>
                      <div className="text-sm text-gray-600">Debt-to-Income</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">{dashboardData.emergencyFundMonths}m</div>
                      <div className="text-sm text-gray-600">Emergency Fund</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900">{dashboardData.creditScore}</div>
                      <div className="text-sm text-gray-600">Credit Score</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Daily Tip Card */}
              {dailyTip && (
                <div className={`${PsychologyUI.financial.getCognitiveLoadReduction().simpleCard} group hover:shadow-lg transition-all duration-300`}>
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-yellow-100 rounded-full">
                      <Lightbulb className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">💡 Daily Financial Tip</h3>
                      <h4 className="font-medium text-gray-900 mb-2">{dailyTip.title}</h4>
                      <p className="text-gray-700 mb-3">{dailyTip.description}</p>
                      <div className="flex items-center space-x-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                          dailyTip.difficulty === 'beginner' ? 'bg-green-100 text-green-800 border-green-200' :
                          dailyTip.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                          'bg-red-100 text-red-800 border-red-200'
                        }`}>
                          {dailyTip.difficulty}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                          dailyTip.impact === 'high' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                          dailyTip.impact === 'medium' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                          'bg-gray-100 text-gray-800 border-gray-200'
                        }`}>
                          {dailyTip.impact} impact
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link href="/income" className={`${PsychologyUI.financial.getActionElements().primaryButton} flex items-center justify-center space-x-2`}>
                  <Plus className="w-4 h-4" />
                  <span>Add Income</span>
                </Link>
                <Link href="/expenses" className={`${PsychologyUI.financial.getActionElements().secondaryButton} flex items-center justify-center space-x-2`}>
                  <Plus className="w-4 h-4" />
                  <span>Add Expense</span>
                </Link>
                <Link href="/goals" className={`${PsychologyUI.financial.getActionElements().successButton} flex items-center justify-center space-x-2`}>
                  <Target className="w-4 h-4" />
                  <span>Set Goal</span>
                </Link>
                <Link href="/education" className={`${PsychologyUI.financial.getActionElements().secondaryButton} flex items-center justify-center space-x-2`}>
                  <BookOpen className="w-4 h-4" />
                  <span>Learn More</span>
                </Link>
              </div>
            </div>
          )}

          {activeTab === 'education' && (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Financial Education</h3>
              <p className="text-gray-600 mb-6">Learn essential financial concepts and get personalized tips</p>
              <Link href="/education" className={`${PsychologyUI.financial.getActionElements().primaryButton} inline-flex items-center space-x-2`}>
                <BookOpen className="w-4 h-4" />
                <span>Start Learning</span>
              </Link>
            </div>
          )}

          {activeTab === 'health' && (
            <div className="text-center py-12">
              <Heart className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Financial Health Dashboard</h3>
              <p className="text-gray-600 mb-6">Get detailed insights into your financial wellness</p>
              <Link href="/financial-health" className={`${PsychologyUI.financial.getActionElements().primaryButton} inline-flex items-center space-x-2`}>
                <Heart className="w-4 h-4" />
                <span>View Health Score</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
