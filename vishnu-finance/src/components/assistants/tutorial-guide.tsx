'use client';

import React, { useState } from 'react';
import { 
  Home, 
  TrendingUp, 
  Receipt, 
  Target, 
  Star, 
  Clock, 
  BarChart3, 
  Settings,
  DollarSign,
  BookOpen,
  X,
  ChevronRight,
  Lightbulb,
  Info,
  CheckCircle
} from 'lucide-react';

interface TutorialSection {
  id: string;
  title: string;
  description: string;
  icon: any;
  pages: {
    href: string;
    label: string;
    description: string;
    features: string[];
    tips: string[];
  }[];
}

const tutorialData: TutorialSection[] = [
  {
    id: 'core-finance',
    title: 'Core Finance Management',
    description: 'Essential tools for tracking your money flow',
    icon: Home,
    pages: [
      {
        href: '/',
        label: 'Dashboard',
        description: 'Your financial command center - see everything at a glance',
        features: [
          'Total income, expenses, and savings overview',
          'Monthly trends and financial health indicators',
          'Quick actions to add transactions',
          'Recent activity and upcoming deadlines'
        ],
        tips: [
          'Check daily for financial awareness',
          'Use quick actions for frequent tasks',
          'Monitor savings rate trends'
        ]
      },
      {
        href: '/income',
        label: 'Income Management',
        description: 'Track all your income sources and earnings',
        features: [
          'Add multiple income sources (salary, freelance, investments)',
          'Categorize income by type and frequency',
          'Track payment methods and dates',
          'Generate income reports and trends'
        ],
        tips: [
          'Record income as soon as you receive it',
          'Use categories for better organization',
          'Set up recurring income for automation'
        ]
      },
      {
        href: '/expenses',
        label: 'Expense Tracking',
        description: 'Monitor and control your spending habits',
        features: [
          'Log all expenses with categories',
          'Track payment methods and receipts',
          'Set spending limits and budgets',
          'Analyze spending patterns over time'
        ],
        tips: [
          'Record expenses immediately to avoid forgetting',
          'Use categories to identify spending patterns',
          'Review monthly to find savings opportunities'
        ]
      }
    ]
  },
  {
    id: 'planning',
    title: 'Planning & Goals',
    description: 'Plan your financial future and achieve your dreams',
    icon: Target,
    pages: [
      {
        href: '/goals',
        label: 'Financial Goals',
        description: 'Set, track, and achieve your financial objectives',
        features: [
          'Create short-term and long-term goals',
          'Set target amounts and deadlines',
          'Track progress with visual indicators',
          'Get recommendations for goal achievement'
        ],
        tips: [
          'Start with small, achievable goals',
          'Review and adjust goals monthly',
          'Celebrate milestones to stay motivated'
        ]
      },
      {
        href: '/wishlist',
        label: 'Wishlist & Dreams',
        description: 'Plan and track your dream purchases',
        features: [
          'Add items with prices and priorities',
          'Track price changes and deals',
          'Set savings targets for big purchases',
          'Get recommendations for better deals'
        ],
        tips: [
          'Prioritize items by importance',
          'Wait for sales and price drops',
          'Save systematically for expensive items'
        ]
      },
      {
        href: '/deadlines',
        label: 'Bill Reminders',
        description: 'Never miss important payments and deadlines',
        features: [
          'Set reminders for bills and payments',
          'Track recurring and one-time deadlines',
          'Get notifications before due dates',
          'Mark completed payments'
        ],
        tips: [
          'Set reminders 3-5 days before due',
          'Use recurring deadlines for regular bills',
          'Review upcoming deadlines weekly'
        ]
      }
    ]
  },
  {
    id: 'professional',
    title: 'Professional & Analysis',
    description: 'Advanced tools for career and financial analysis',
    icon: BarChart3,
    pages: [
      {
        href: '/salary-structure',
        label: 'Salary Structure',
        description: 'Manage and analyze your compensation details',
        features: [
          'Track salary components and benefits',
          'Monitor salary growth over time',
          'Compare with market standards',
          'Plan salary negotiations'
        ],
        tips: [
          'Update when you get raises or changes',
          'Track total compensation, not just salary',
          'Use for career planning and negotiations'
        ]
      },
      {
        href: '/reports',
        label: 'Reports & Analytics',
        description: 'Deep insights into your financial patterns',
        features: [
          'Comprehensive financial reports',
          'Spending analysis and trends',
          'Goal progress tracking',
          'AI-powered financial insights'
        ],
        tips: [
          'Review reports monthly for insights',
          'Use trends to adjust your budget',
          'Share reports with financial advisors'
        ]
      }
    ]
  },
  {
    id: 'system',
    title: 'System & Settings',
    description: 'Configure and customize your experience',
    icon: Settings,
    pages: [
      {
        href: '/settings',
        label: 'Settings & Preferences',
        description: 'Customize the app to your needs',
        features: [
          'Profile and account settings',
          'Notification preferences',
          'Theme and appearance options',
          'Data export and backup'
        ],
        tips: [
          'Set up notifications for important events',
          'Choose a theme that works for you',
          'Regularly backup your financial data'
        ]
      }
    ]
  }
];

export default function TutorialGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const toggleSection = (sectionId: string) => {
    setActiveSection(activeSection === sectionId ? null : sectionId);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 minimal-button-primary p-4 rounded-full shadow-lg hover:scale-110 transition-all"
        title="Open Tutorial Guide"
      >
        <BookOpen className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-secondary p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BookOpen className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Vishnu Finance Tutorial</h1>
                <p className="text-white/80">Learn how to use every feature effectively</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="space-y-6">
            {tutorialData.map((section) => {
              const Icon = section.icon;
              const isExpanded = activeSection === section.id;
              
              return (
                <div key={section.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Section Header */}
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="w-6 h-6 text-primary" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                        <p className="text-sm text-gray-600">{section.description}</p>
                      </div>
                    </div>
                    <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </button>

                  {/* Section Content */}
                  {isExpanded && (
                    <div className="p-4 space-y-4">
                      {section.pages.map((page) => (
                        <div key={page.href} className="border-l-4 border-primary pl-4 space-y-3">
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900">{page.label}</h4>
                            <p className="text-gray-600">{page.description}</p>
                          </div>
                          
                          {/* Features */}
                          <div>
                            <h5 className="text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                              <CheckCircle className="w-4 h-4 text-success" />
                              <span>Key Features</span>
                            </h5>
                            <ul className="space-y-1">
                              {page.features.map((feature, index) => (
                                <li key={index} className="text-sm text-gray-600 flex items-start space-x-2">
                                  <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Tips */}
                          <div>
                            <h5 className="text-sm font-semibold text-gray-700 mb-2 flex items-center space-x-2">
                              <Lightbulb className="w-4 h-4 text-warning" />
                              <span>Pro Tips</span>
                            </h5>
                            <ul className="space-y-1">
                              {page.tips.map((tip, index) => (
                                <li key={index} className="text-sm text-gray-600 flex items-start space-x-2">
                                  <div className="w-1.5 h-1.5 bg-warning rounded-full mt-2 flex-shrink-0"></div>
                                  <span>{tip}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Start Guide */}
          <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center space-x-2">
              <Info className="w-5 h-5" />
              <span>Quick Start Guide</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-semibold text-blue-800">Day 1: Setup</h4>
                <p className="text-blue-700">Add your income sources and set up basic categories</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-blue-800">Week 1: Track Everything</h4>
                <p className="text-blue-700">Log all expenses and income for a complete picture</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-blue-800">Month 1: Set Goals</h4>
                <p className="text-blue-700">Create financial goals and start your wishlist</p>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <div className="mt-8 text-center">
            <button
              onClick={() => setIsOpen(false)}
              className="minimal-button-primary px-8 py-3 text-lg font-medium"
            >
              Got It! Close Tutorial
            </button>
            <p className="text-sm text-muted mt-2">
              You can always reopen this tutorial using the book icon
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


