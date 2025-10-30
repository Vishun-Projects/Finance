'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Star,
  Heart,
  Zap,
  Brain,
  Eye,
  EyeOff,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  CreditCard,
  Building,
  FileText,
  Calculator,
  Award,
  Users,
  Lightbulb,
  BookOpen,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  RefreshCw,
  Settings,
  Bell,
  Info,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { PsychologyUI, FinancialBehaviorTriggers } from '../lib/psychology-ui';
import { FinancialEducation } from '../lib/financial-education';

interface FinancialHealthData {
  score: number;
  category: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  factors: {
    savingsRate: number;
    debtToIncome: number;
    emergencyFund: number;
    investmentRatio: number;
    spendingControl: number;
  };
  recommendations: string[];
  strengths: string[];
  weaknesses: string[];
  trends: {
    savings: number;
    expenses: number;
    income: number;
    debt: number;
  };
  goals: Array<{
    id: string;
    title: string;
    target: number;
    current: number;
    deadline: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  alerts: Array<{
    id: string;
    type: 'warning' | 'info' | 'success' | 'error';
    title: string;
    message: string;
    action?: string;
  }>;
}

interface FinancialHealthDashboardProps {
  userId: string;
  userProfile?: {
    age: number;
    income: number;
    expenses: number;
    savings: number;
    debt: number;
    experience: 'beginner' | 'intermediate' | 'advanced';
  };
}

export default function FinancialHealthDashboard({ userId, userProfile }: FinancialHealthDashboardProps) {
  const [healthData, setHealthData] = useState<FinancialHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'goals' | 'alerts' | 'tips'>('overview');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Mock data - in real app, this would come from API
  useEffect(() => {
    const mockHealthData: FinancialHealthData = {
      score: 78,
      category: 'good',
      factors: {
        savingsRate: 22,
        debtToIncome: 18,
        emergencyFund: 4.2,
        investmentRatio: 12,
        spendingControl: 85
      },
      recommendations: [
        'Increase your emergency fund to 6 months of expenses',
        'Consider increasing your investment allocation to 15%',
        'Review your spending patterns to improve control'
      ],
      strengths: [
        'Excellent savings rate above 20%',
        'Low debt-to-income ratio',
        'Good spending control'
      ],
      weaknesses: [
        'Emergency fund could be larger',
        'Investment ratio below recommended level'
      ],
      trends: {
        savings: 15,
        expenses: -8,
        income: 12,
        debt: -25
      },
      goals: [
        {
          id: '1',
          title: 'Emergency Fund',
          target: 150000,
          current: 105000,
          deadline: '2024-12-31',
          priority: 'high'
        },
        {
          id: '2',
          title: 'Vacation Fund',
          target: 50000,
          current: 25000,
          deadline: '2024-06-30',
          priority: 'medium'
        },
        {
          id: '3',
          title: 'Home Down Payment',
          target: 500000,
          current: 125000,
          deadline: '2025-12-31',
          priority: 'high'
        }
      ],
      alerts: [
        {
          id: '1',
          type: 'warning',
          title: 'Emergency Fund Low',
          message: 'Your emergency fund covers only 4.2 months of expenses. Consider increasing to 6 months.',
          action: 'Increase Emergency Fund'
        },
        {
          id: '2',
          type: 'info',
          title: 'Investment Opportunity',
          message: 'Your investment ratio is below the recommended 15% for your age group.',
          action: 'Start SIP'
        },
        {
          id: '3',
          type: 'success',
          title: 'Great Progress!',
          message: 'You\'ve increased your savings rate by 15% this month. Keep it up!'
        }
      ]
    };

    setTimeout(() => {
      setHealthData(mockHealthData);
      setLoading(false);
    }, 1000);
  }, [userId]);

  const toggleCardExpansion = (cardId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(cardId)) {
      newExpanded.delete(cardId);
    } else {
      newExpanded.add(cardId);
    }
    setExpandedCards(newExpanded);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 75) return 'bg-blue-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'info': return <Info className="w-5 h-5 text-blue-600" />;
      case 'success': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error': return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default: return <Info className="w-5 h-5 text-gray-600" />;
    }
  };

  const getAlertBgColor = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'info': return 'bg-blue-50 border-blue-200';
      case 'success': return 'bg-green-50 border-green-200';
      case 'error': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getAlertTextColor = (type: string) => {
    switch (type) {
      case 'warning': return 'text-yellow-800';
      case 'info': return 'text-blue-800';
      case 'success': return 'text-green-800';
      case 'error': return 'text-red-800';
      default: return 'text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!healthData) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
          <p className="text-gray-600">Unable to load financial health data. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financial Health Dashboard</h1>
          <p className="text-gray-600 mt-1">Your comprehensive financial wellness overview</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{showDetails ? 'Hide Details' : 'Show Details'}</span>
          </button>
          <button className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Health Score Card */}
      <div className={`${PsychologyUI.financial.getCognitiveLoadReduction().simpleCard} relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-green-50 opacity-50"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Financial Health Score</h2>
              <p className="text-gray-600">Based on your financial habits and goals</p>
            </div>
            <div className="text-right">
              <div className={`text-4xl font-bold ${getScoreColor(healthData.score)}`}>
                {healthData.score}/100
              </div>
              <div className={`text-lg font-medium ${getScoreColor(healthData.score)}`}>
                {healthData.category.toUpperCase()}
              </div>
            </div>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
            <div 
              className={`h-4 rounded-full transition-all duration-1000 ${getScoreBgColor(healthData.score)}`}
              style={{ width: `${healthData.score}%` }}
            ></div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(healthData.factors).map(([key, value]) => (
              <div key={key} className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {key === 'emergencyFund' ? `${value.toFixed(1)}m` : `${value}%`}
                </div>
                <div className="text-sm text-gray-600 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'goals', label: 'Goals', icon: Target },
          { id: 'alerts', label: 'Alerts', icon: Bell },
          { id: 'tips', label: 'Tips', icon: Lightbulb }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trends Card */}
            <div className={`${PsychologyUI.financial.getCognitiveLoadReduction().simpleCard}`}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <span>Financial Trends</span>
              </h3>
              <div className="space-y-4">
                {Object.entries(healthData.trends).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-gray-600 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <div className="flex items-center space-x-2">
                      {value > 0 ? (
                        <ArrowUpRight className="w-4 h-4 text-green-600" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-red-600" />
                      )}
                      <span className={`font-medium ${value > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {Math.abs(value)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Strengths & Weaknesses */}
            <div className={`${PsychologyUI.financial.getCognitiveLoadReduction().simpleCard}`}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Award className="w-5 h-5 text-green-600" />
                <span>Strengths & Areas for Improvement</span>
              </h3>
              <div className="space-y-4">
                {healthData.strengths.length > 0 && (
                  <div>
                    <h4 className="font-medium text-green-800 mb-2 flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>Strengths</span>
                    </h4>
                    <ul className="space-y-1">
                      {healthData.strengths.map((strength, index) => (
                        <li key={index} className="text-sm text-green-700 flex items-center space-x-2">
                          <CheckCircle className="w-3 h-3" />
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {healthData.weaknesses.length > 0 && (
                  <div>
                    <h4 className="font-medium text-yellow-800 mb-2 flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Areas for Improvement</span>
                    </h4>
                    <ul className="space-y-1">
                      {healthData.weaknesses.map((weakness, index) => (
                        <li key={index} className="text-sm text-yellow-700 flex items-center space-x-2">
                          <AlertTriangle className="w-3 h-3" />
                          <span>{weakness}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'goals' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Financial Goals</h3>
              <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                <Target className="w-4 h-4" />
                <span>Add Goal</span>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {healthData.goals.map((goal) => {
                const progress = (goal.current / goal.target) * 100;
                const daysLeft = Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                
                return (
                  <div key={goal.id} className={`${PsychologyUI.financial.getCognitiveLoadReduction().simpleCard} group hover:shadow-lg transition-all duration-300`}>
                    <div className="flex items-start justify-between mb-4">
                      <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {goal.title}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(goal.priority)}`}>
                        {goal.priority}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Progress</span>
                          <span>{progress.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="h-2 bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">₹{goal.current.toLocaleString()}</span>
                        <span className="text-gray-600">₹{goal.target.toLocaleString()}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Days left</span>
                        <span className={`font-medium ${daysLeft < 30 ? 'text-red-600' : 'text-gray-900'}`}>
                          {daysLeft}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Financial Alerts</h3>
              <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
                <Settings className="w-4 h-4" />
                <span>Manage Alerts</span>
              </button>
            </div>
            
            <div className="space-y-4">
              {healthData.alerts.map((alert) => (
                <div key={alert.id} className={`${getAlertBgColor(alert.type)} border rounded-lg p-4`}>
                  <div className="flex items-start space-x-3">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <h4 className={`font-medium ${getAlertTextColor(alert.type)}`}>
                        {alert.title}
                      </h4>
                      <p className={`text-sm ${getAlertTextColor(alert.type)} mt-1`}>
                        {alert.message}
                      </p>
                      {alert.action && (
                        <button className={`mt-3 text-sm font-medium ${getAlertTextColor(alert.type)} hover:underline`}>
                          {alert.action} →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'tips' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Personalized Tips</h3>
              <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                <RefreshCw className="w-4 h-4" />
                <span>Refresh Tips</span>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {healthData.recommendations.map((recommendation, index) => (
                <div key={index} className={`${PsychologyUI.financial.getCognitiveLoadReduction().simpleCard} group hover:shadow-lg transition-all duration-300`}>
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Lightbulb className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                        Recommendation {index + 1}
                      </h4>
                      <p className="text-gray-700 mt-1 leading-relaxed">
                        {recommendation}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
