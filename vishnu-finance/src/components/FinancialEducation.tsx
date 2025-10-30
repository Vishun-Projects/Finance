'use client';

import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Lightbulb, 
  Target, 
  TrendingUp, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Star,
  Search,
  Filter,
  ChevronRight,
  ChevronDown,
  Info,
  Award,
  Users,
  Calculator,
  PiggyBank,
  CreditCard,
  Building,
  FileText,
  Heart,
  Zap,
  Brain,
  Eye,
  EyeOff
} from 'lucide-react';
import { FinancialEducation, FinancialTip, FinancialConcept, FinancialScenario } from '../lib/financial-education';
import { PsychologyUI } from '../lib/psychology-ui';

interface FinancialEducationProps {
  userProfile?: {
    age: number;
    income: number;
    expenses: number;
    savings: number;
    debt: number;
    experience: 'beginner' | 'intermediate' | 'advanced';
  };
}

type TabType = 'tips' | 'concepts' | 'scenarios' | 'assessment' | 'personalized';

export default function FinancialEducationComponent({ userProfile }: FinancialEducationProps) {
  const [activeTab, setActiveTab] = useState<TabType>('tips');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTip, setSelectedTip] = useState<FinancialTip | null>(null);
  const [selectedConcept, setSelectedConcept] = useState<FinancialConcept | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<FinancialScenario | null>(null);
  const [showAssessment, setShowAssessment] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<any>(null);
  const [expandedTips, setExpandedTips] = useState<Set<string>>(new Set());

  const categories = [
    { id: 'all', label: 'All Topics', icon: BookOpen },
    { id: 'budgeting', label: 'Budgeting', icon: Calculator },
    { id: 'saving', label: 'Saving', icon: PiggyBank },
    { id: 'investing', label: 'Investing', icon: TrendingUp },
    { id: 'debt', label: 'Debt Management', icon: CreditCard },
    { id: 'insurance', label: 'Insurance', icon: Shield },
    { id: 'tax', label: 'Tax Planning', icon: FileText },
    { id: 'emergency', label: 'Emergency Planning', icon: AlertTriangle },
    { id: 'retirement', label: 'Retirement', icon: Building }
  ];

  const difficultyColors = {
    beginner: 'bg-green-100 text-green-800 border-green-200',
    intermediate: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    advanced: 'bg-red-100 text-red-800 border-red-200'
  };

  const impactColors = {
    low: 'bg-gray-100 text-gray-800 border-gray-200',
    medium: 'bg-blue-100 text-blue-800 border-blue-200',
    high: 'bg-purple-100 text-purple-800 border-purple-200'
  };

  // Get filtered tips
  const getFilteredTips = (): FinancialTip[] => {
    let tips = FinancialEducation.getActionableTips();
    
    if (selectedCategory !== 'all') {
      tips = tips.filter(tip => tip.category === selectedCategory);
    }
    
    if (searchQuery) {
      tips = FinancialEducation.searchTips(searchQuery);
    }
    
    return tips;
  };

  // Get personalized recommendations
  const getPersonalizedRecommendations = (): FinancialTip[] => {
    if (!userProfile) return [];
    return FinancialEducation.getPersonalizedRecommendations(userProfile);
  };

  // Toggle tip expansion
  const toggleTipExpansion = (tipId: string) => {
    const newExpanded = new Set(expandedTips);
    if (newExpanded.has(tipId)) {
      newExpanded.delete(tipId);
    } else {
      newExpanded.add(tipId);
    }
    setExpandedTips(newExpanded);
  };

  // Run financial health assessment
  const runAssessment = () => {
    if (!userProfile) return;
    
    const result = FinancialEducation.assessFinancialHealth({
      income: userProfile.income,
      expenses: userProfile.expenses,
      savings: userProfile.savings,
      debt: userProfile.debt,
      emergencyFund: userProfile.savings * 0.3, // Assume 30% of savings is emergency fund
      age: userProfile.age
    });
    
    setAssessmentResult(result);
    setShowAssessment(true);
  };

  const renderTipCard = (tip: FinancialTip) => {
    const isExpanded = expandedTips.has(tip.id);
    const CategoryIcon = categories.find(c => c.id === tip.category)?.icon || BookOpen;

    return (
      <div key={tip.id} className={`${PsychologyUI.financial.getCognitiveLoadReduction().simpleCard} group hover:shadow-lg transition-all duration-300`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CategoryIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                {tip.title}
              </h3>
              <p className="text-sm text-gray-600">{tip.timeframe}</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${difficultyColors[tip.difficulty]}`}>
              {tip.difficulty}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${impactColors[tip.impact]}`}>
              {tip.impact} impact
            </span>
          </div>
        </div>

        <p className="text-gray-700 mb-4 leading-relaxed">{tip.description}</p>

        {tip.benefit && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Benefit:</span>
            </div>
            <p className="text-sm text-green-700 mt-1">{tip.benefit}</p>
          </div>
        )}

        {tip.example && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center space-x-2">
              <Lightbulb className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Example:</span>
            </div>
            <p className="text-sm text-blue-700 mt-1">{tip.example}</p>
          </div>
        )}

        {tip.warning && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">Warning:</span>
            </div>
            <p className="text-sm text-yellow-700 mt-1">{tip.warning}</p>
          </div>
        )}

        <button
          onClick={() => toggleTipExpansion(tip.id)}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors"
        >
          <span className="text-sm font-medium">
            {isExpanded ? 'Hide Steps' : 'Show Steps'}
          </span>
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {isExpanded && tip.steps && (
          <div className="mt-4 space-y-2">
            <h4 className="font-medium text-gray-900 mb-3">Action Steps:</h4>
            {tip.steps.map((step, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-blue-600">{index + 1}</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderConceptCard = (concept: FinancialConcept) => {
    return (
      <div key={concept.term} className={`${PsychologyUI.financial.getCognitiveLoadReduction().simpleCard} group hover:shadow-lg transition-all duration-300`}>
        <div className="flex items-start justify-between mb-4">
          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
            {concept.term}
          </h3>
          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
            {concept.category}
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Definition:</h4>
            <p className="text-gray-700 leading-relaxed">{concept.definition}</p>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Why it matters:</h4>
            <p className="text-gray-700 leading-relaxed">{concept.importance}</p>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Example:</h4>
            <p className="text-gray-700 leading-relaxed">{concept.example}</p>
          </div>

          {concept.relatedTerms.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Related terms:</h4>
              <div className="flex flex-wrap gap-2">
                {concept.relatedTerms.map((term, index) => (
                  <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                    {term}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderScenarioCard = (scenario: FinancialScenario) => {
    return (
      <div key={scenario.id} className={`${PsychologyUI.financial.getCognitiveLoadReduction().simpleCard} group hover:shadow-lg transition-all duration-300`}>
        <div className="mb-4">
          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-2">
            {scenario.title}
          </h3>
          <p className="text-gray-700 leading-relaxed">{scenario.description}</p>
        </div>

        <div className="space-y-3">
          {scenario.options.map((option, index) => (
            <div key={index} className={`p-3 rounded-lg border ${
              index === scenario.correctChoice 
                ? 'bg-green-50 border-green-200' 
                : option.impact === 'negative'
                ? 'bg-red-50 border-red-200'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-start space-x-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  index === scenario.correctChoice 
                    ? 'bg-green-500 text-white' 
                    : option.impact === 'negative'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-500 text-white'
                }`}>
                  {String.fromCharCode(65 + index)}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 mb-1">{option.choice}</p>
                  <p className="text-sm text-gray-600 mb-2">{option.outcome}</p>
                  <p className="text-sm text-gray-700">{option.explanation}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Brain className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-blue-800">Key Learning:</span>
          </div>
          <p className="text-sm text-blue-700">{scenario.learning}</p>
        </div>
      </div>
    );
  };

  const renderAssessmentResult = () => {
    if (!assessmentResult) return null;

    const scoreColor = assessmentResult.score >= 75 ? 'text-green-600' : 
                      assessmentResult.score >= 50 ? 'text-yellow-600' : 'text-red-600';

    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className={`text-4xl font-bold ${scoreColor} mb-2`}>
            {assessmentResult.score}/100
          </div>
          <div className={`text-lg font-medium ${scoreColor} mb-4`}>
            {assessmentResult.category.toUpperCase()} Financial Health
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-1000 ${
                assessmentResult.score >= 75 ? 'bg-green-500' : 
                assessmentResult.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${assessmentResult.score}%` }}
            ></div>
          </div>
        </div>

        {assessmentResult.strengths.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-800 mb-3 flex items-center space-x-2">
              <CheckCircle className="w-5 h-5" />
              <span>Your Strengths</span>
            </h4>
            <ul className="space-y-1">
              {assessmentResult.strengths.map((strength, index) => (
                <li key={index} className="text-sm text-green-700 flex items-center space-x-2">
                  <CheckCircle className="w-3 h-3" />
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {assessmentResult.weaknesses.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-800 mb-3 flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5" />
              <span>Areas for Improvement</span>
            </h4>
            <ul className="space-y-1">
              {assessmentResult.weaknesses.map((weakness, index) => (
                <li key={index} className="text-sm text-yellow-700 flex items-center space-x-2">
                  <AlertTriangle className="w-3 h-3" />
                  <span>{weakness}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {assessmentResult.recommendations.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-3 flex items-center space-x-2">
              <Target className="w-5 h-5" />
              <span>Recommendations</span>
            </h4>
            <ul className="space-y-2">
              {assessmentResult.recommendations.map((recommendation, index) => (
                <li key={index} className="text-sm text-blue-700 flex items-start space-x-2">
                  <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{recommendation}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-3">
          <div className="p-3 bg-blue-100 rounded-full">
            <BookOpen className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Financial Education Center</h1>
        </div>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Learn essential financial concepts and get personalized tips to improve your financial health. 
          Perfect for beginners and those looking to enhance their financial knowledge.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap justify-center space-x-1 bg-gray-100 rounded-lg p-1">
        {[
          { id: 'tips', label: 'Financial Tips', icon: Lightbulb },
          { id: 'concepts', label: 'Concepts', icon: BookOpen },
          { id: 'scenarios', label: 'Scenarios', icon: Brain },
          { id: 'assessment', label: 'Assessment', icon: Target },
          { id: 'personalized', label: 'Personalized', icon: Users }
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

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'tips' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search financial tips..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex space-x-2 overflow-x-auto">
                {categories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg whitespace-nowrap transition-colors ${
                        selectedCategory === category.id
                          ? 'bg-blue-100 text-blue-600 border border-blue-200'
                          : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{category.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tips Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {getFilteredTips().map(renderTipCard)}
            </div>
          </div>
        )}

        {activeTab === 'concepts' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Financial Concepts</h2>
              <p className="text-gray-600">Learn essential financial terms and concepts</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {FinancialEducation.searchConcepts(searchQuery).map(renderConceptCard)}
            </div>
          </div>
        )}

        {activeTab === 'scenarios' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Financial Scenarios</h2>
              <p className="text-gray-600">Test your financial decision-making skills</p>
            </div>
            <div className="grid grid-cols-1 gap-6">
              {[FinancialEducation.getRandomScenario()].map(renderScenarioCard)}
            </div>
          </div>
        )}

        {activeTab === 'assessment' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Financial Health Assessment</h2>
              <p className="text-gray-600">Get a personalized assessment of your financial health</p>
            </div>
            
            {!showAssessment ? (
              <div className="max-w-md mx-auto">
                <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                  <Target className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Assess Your Financial Health?</h3>
                  <p className="text-gray-600 mb-6">
                    Get personalized recommendations based on your financial situation
                  </p>
                  <button
                    onClick={runAssessment}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                  >
                    Start Assessment
                  </button>
                </div>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto">
                {renderAssessmentResult()}
              </div>
            )}
          </div>
        )}

        {activeTab === 'personalized' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Personalized Recommendations</h2>
              <p className="text-gray-600">Tips tailored to your financial situation</p>
            </div>
            
            {userProfile ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {getPersonalizedRecommendations().map(renderTipCard)}
              </div>
            ) : (
              <div className="max-w-md mx-auto">
                <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Personalized Tips</h3>
                  <p className="text-gray-600 mb-6">
                    Connect your profile to get personalized financial recommendations
                  </p>
                  <button className="w-full bg-gray-100 text-gray-600 font-semibold py-3 px-4 rounded-lg">
                    Connect Profile
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
