'use client';

import React, { useState, useEffect } from 'react';
import { Send, TrendingUp, MessageSquare, Brain, BarChart3 } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface FinancialAnalysis {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number;
  monthlyTrends: Array<{
    month: string;
    income: number;
    expenses: number;
    savings: number;
  }>;
  topExpenseCategories: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  incomeSources: Array<{
    name: string;
    amount: number;
    frequency: string;
  }>;
  recentTransactions: Array<{
    type: 'income' | 'expense';
    title: string;
    amount: number;
    date: string;
  }>;
  financialHealth: {
    score: number;
    status: string;
    recommendations: string[];
  };
}

interface MarketTrends {
  stocks: {
    sensex: { trend: string; change: string; value: string };
    nifty: { trend: string; change: string; value: string };
    bankNifty: { trend: string; change: string; value: string };
  };
  crypto: {
    bitcoin: { trend: string; change: string; value: string };
    ethereum: { trend: string; change: string; value: string };
  };
  commodities: {
    gold: { trend: string; change: string; value: string };
    silver: { trend: string; change: string; value: string };
  };
  lastUpdated: string;
}

const AIFinancialAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<FinancialAnalysis | null>(null);
  const [marketTrends, setMarketTrends] = useState<MarketTrends | null>(null);
  const [chatHistory, setChatHistory] = useState<Array<{ message: string; response: string; timestamp: string }>>([]);
  const [activeTab, setActiveTab] = useState<'chat' | 'insights' | 'trends'>('chat');

  useEffect(() => {
    // Load initial insights
    fetchAIInsights();
  }, []);

  const fetchAIInsights = async () => {
    try {
      // Use your actual user ID from the database
      const userId = 'cmez473ni0000b2nsk1vct894'; // Your real user ID
      
      const response = await fetch('/api/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Give me a financial overview', userId })
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysis(data.analysis);
        setMarketTrends(data.marketTrends);
        setChatHistory(data.chatHistory || []);
        
        // Add initial AI message
        setMessages([{
          id: '1',
          text: 'Hello! I\'m your AI Financial Assistant. I can help you with:\n\n💡 Financial insights and analysis\n📈 Market trends and investment advice\n🎯 Goal tracking and recommendations\n💰 Budget optimization\n\nAsk me anything about your finances!',
          isUser: false,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Error fetching AI insights:', error);
    }
  };

  const handleUserMessage = async (message: string) => {
    if (!message.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: message,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Use the same real user ID
      const userId = 'cmez473ni0000b2nsk1vct894'; // Your real user ID
      
      const response = await fetch('/api/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, userId })
      });

      if (response.ok) {
        const data = await response.json();
        
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: data.response,
          isUser: false,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, aiMessage]);
        setAnalysis(data.analysis);
        setMarketTrends(data.marketTrends);
        setChatHistory(data.chatHistory || []);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error. Please try again.',
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleUserMessage(inputMessage);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'bullish': return '📈';
      case 'bearish': return '📉';
      default: return '➡️';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'bullish': return 'text-green-600';
      case 'bearish': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-lg">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">AI Financial Assistant</h3>
            <p className="text-sm text-gray-600">Powered by advanced AI analysis</p>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'chat' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <MessageSquare className="h-4 w-4 inline mr-1" />
            Chat
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'insights' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Brain className="h-4 w-4 inline mr-1" />
            Insights
          </button>
          <button
            onClick={() => setActiveTab('trends')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'trends' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <TrendingUp className="h-4 w-4 inline mr-1" />
            Market Trends
          </button>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'chat' && (
        <div className="space-y-4">
          {/* Chat Messages */}
          <div className="h-96 overflow-y-auto space-y-4 border rounded-lg p-4 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.isUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-900 border shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm">{message.text}</p>
                  <p className={`text-xs mt-1 ${
                    message.isUser ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-900 border shadow-sm px-4 py-2 rounded-lg">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about your finances, market trends, or get advice..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              onClick={() => handleUserMessage(inputMessage)}
              disabled={isLoading || !inputMessage.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>

          {/* Chat History Preview */}
          {chatHistory.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800 font-medium mb-2">
                💾 Chat Memory: {chatHistory.length} previous conversations stored
              </p>
              <p className="text-xs text-blue-600">
                I remember our previous chats for better, personalized responses!
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'insights' && analysis && (
        <div className="space-y-6">
          {/* Financial Health Score */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
            <h4 className="text-lg font-semibold mb-2">Financial Health Score</h4>
            <div className="flex items-center space-x-4">
              <div className="text-3xl font-bold">{analysis.financialHealth.score}/100</div>
              <div className="text-lg">{analysis.financialHealth.status}</div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h5 className="font-semibold text-green-800">Total Income</h5>
              <p className="text-2xl font-bold text-green-600">₹{analysis.totalIncome.toLocaleString()}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h5 className="font-semibold text-red-800">Total Expenses</h5>
              <p className="text-2xl font-bold text-red-600">₹{analysis.totalExpenses.toLocaleString()}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h5 className="font-semibold text-blue-800">Net Savings</h5>
              <p className="text-2xl font-bold text-blue-600">₹{analysis.netSavings.toLocaleString()}</p>
            </div>
          </div>

          {/* Recommendations */}
          {analysis.financialHealth.recommendations.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h5 className="font-semibold text-yellow-800 mb-2">AI Recommendations</h5>
              <ul className="space-y-1">
                {analysis.financialHealth.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm text-yellow-700">• {rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {activeTab === 'trends' && (
        <div className="space-y-6">
          {/* Market Overview */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 text-center">
              📊 Market data last updated: {new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
            </p>
          </div>

          {/* Stock Market */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Stock Market Trends
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border rounded-lg p-4">
                <h5 className="font-medium text-gray-900">Sensex</h5>
                <p className="text-2xl font-bold text-gray-900">74,000</p>
                <p className="text-sm font-medium text-green-600">
                  📈 +0.8% (bullish)
                </p>
              </div>
              <div className="bg-white border rounded-lg p-4">
                <h5 className="font-medium text-gray-900">Nifty</h5>
                <p className="text-2xl font-bold text-gray-900">22,500</p>
                <p className="text-sm font-medium text-green-600">
                  📈 +0.7% (bullish)
                </p>
              </div>
              <div className="bg-white border rounded-lg p-4">
                <h5 className="font-medium text-gray-900">Bank Nifty</h5>
                <p className="text-2xl font-bold text-gray-900">48,000</p>
                <p className="text-sm font-medium text-gray-600">
                  ➡️ +0.2% (neutral)
                </p>
              </div>
            </div>
          </div>

          {/* Crypto */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900">Cryptocurrency</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border rounded-lg p-4">
                <h5 className="font-medium text-gray-900">Bitcoin</h5>
                <p className="text-2xl font-bold text-gray-900">$65,000</p>
                <p className="text-sm font-medium text-green-600">
                  📈 +2.1% (bullish)
                </p>
              </div>
              <div className="bg-white border rounded-lg p-4">
                <h5 className="font-medium text-gray-900">Ethereum</h5>
                <p className="text-2xl font-bold text-gray-900">$3,200</p>
                <p className="text-sm font-medium text-green-600">
                  📈 +1.8% (bullish)
                </p>
              </div>
            </div>
          </div>

          {/* Commodities */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900">Commodities</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border rounded-lg p-4">
                <h5 className="font-medium text-gray-900">Gold</h5>
                <p className="text-2xl font-bold text-gray-900">₹6,200/g</p>
                <p className="text-sm font-medium text-green-600">
                  📈 +0.9% (bullish)
                </p>
              </div>
              <div className="bg-white border rounded-lg p-4">
                <h5 className="font-medium text-gray-900">Silver</h5>
                <p className="text-2xl font-bold text-gray-900">₹75,000/kg</p>
                <p className="text-sm font-medium text-gray-600">
                  ➡️ +0.3% (neutral)
                </p>
              </div>
            </div>
          </div>

          {/* Investment Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h5 className="font-semibold text-blue-800 mb-2">💡 Investment Tips</h5>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• IT and Real Estate sectors showing strong growth</li>
              <li>• Gold continues to be a safe haven asset</li>
              <li>• Consider diversifying into equity mutual funds</li>
              <li>• Bitcoin showing bullish momentum for crypto investors</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIFinancialAssistant;
