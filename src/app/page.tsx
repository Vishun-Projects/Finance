'use client'

import { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  Calendar, 
  Newspaper,
  Plus,
  Settings,
  BarChart3,
  PiggyBank,
  Clock,
  AlertTriangle
} from 'lucide-react'
import { formatCurrency, calculatePercentage } from '@/lib/utils'
import { DashboardStats, CashFlowData, ExpenseByCategory } from '@/types'

/**
 * The main dashboard component.
 *
 * This component displays an overview of the user's financial status,
 * including key statistics, cash flow, expense breakdown, upcoming deadlines, and recent news.
 *
 * @returns {JSX.Element} The rendered dashboard component.
 */
export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalIncome: 75000,
    totalExpenses: 45000,
    netCashFlow: 30000,
    savingsRate: 40,
    upcomingDeadlines: 3,
    activeGoals: 5,
    financialHealthScore: 85
  })

  const [cashFlowData] = useState<CashFlowData[]>([
    { month: 'Jan', income: 75000, expenses: 45000, netFlow: 30000 },
    { month: 'Feb', income: 78000, expenses: 42000, netFlow: 36000 },
    { month: 'Mar', income: 82000, expenses: 48000, netFlow: 34000 },
    { month: 'Apr', income: 79000, expenses: 46000, netFlow: 33000 },
    { month: 'May', income: 85000, expenses: 44000, netFlow: 41000 },
    { month: 'Jun', income: 88000, expenses: 47000, netFlow: 41000 },
  ])

  const [expenseCategories] = useState<ExpenseByCategory[]>([
    { category: 'Housing', amount: 15000, percentage: 33, color: '#3B82F6' },
    { category: 'Food', amount: 8000, percentage: 18, color: '#10B981' },
    { category: 'Transportation', amount: 6000, percentage: 13, color: '#F59E0B' },
    { category: 'Entertainment', amount: 5000, percentage: 11, color: '#EF4444' },
    { category: 'Utilities', amount: 4000, percentage: 9, color: '#8B5CF6' },
    { category: 'Others', amount: 7000, percentage: 16, color: '#6B7280' },
  ])

  const [upcomingDeadlines] = useState([
    { id: '1', title: 'Rent Payment', amount: 15000, dueDate: '2024-01-05', daysLeft: 2 },
    { id: '2', title: 'Electricity Bill', amount: 2500, dueDate: '2024-01-08', daysLeft: 5 },
    { id: '3', title: 'Credit Card', amount: 8000, dueDate: '2024-01-15', daysLeft: 12 },
  ])

  const [recentNews] = useState([
    { id: '1', title: 'RBI keeps repo rate unchanged at 6.5%', source: 'Economic Times', relevance: 0.9 },
    { id: '2', title: 'Sensex hits new all-time high', source: 'Business Standard', relevance: 0.8 },
    { id: '3', title: 'New tax benefits for home loans announced', source: 'Financial Express', relevance: 0.7 },
  ])

  /**
 * A card component to display a single statistic.
 *
 * @param {object} props - The component props.
 * @param {string} props.title - The title of the statistic.
 * @param {string} props.value - The value of the statistic.
 * @param {React.ElementType} props.icon - The icon component to display.
 * @param {number} props.trend - The trend of the statistic (positive or negative).
 * @param {string} props.color - The background color of the icon.
 * @returns {JSX.Element} The rendered statistic card.
 */
  const StatCard = ({ title, value, icon: Icon, trend, color }: any) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {trend && (
            <div className="flex items-center mt-2">
              <Icon className={`w-4 h-4 ${trend > 0 ? 'text-green-500' : 'text-red-500'}`} />
              <span className={`text-sm font-medium ml-1 ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trend > 0 ? '+' : ''}{trend}%
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  )

  /**
 * A button component for quick actions.
 *
 * @param {object} props - The component props.
 * @param {string} props.title - The title of the action.
 * @param {React.ElementType} props.icon - The icon component to display.
 * @param {string} props.color - The background color of the icon.
 * @param {() => void} props.onClick - The function to call when the button is clicked.
 * @returns {JSX.Element} The rendered quick action button.
 */
  const QuickAction = ({ title, icon: Icon, color, onClick }: any) => (
    <button
      onClick={onClick}
      className="flex flex-col items-center p-4 bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-all hover:scale-105"
    >
      <div className={`p-3 rounded-lg ${color} mb-3`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <span className="text-sm font-medium text-gray-700">{title}</span>
    </button>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back, Vishnu! 👋</h2>
          <p className="text-gray-600">Here's your financial overview for today</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Income"
            value={formatCurrency(stats.totalIncome)}
            icon={TrendingUp}
            trend={12}
            color="bg-green-500"
          />
          <StatCard
            title="Total Expenses"
            value={formatCurrency(stats.totalExpenses)}
            icon={TrendingDown}
            trend={-5}
            color="bg-red-500"
          />
          <StatCard
            title="Net Cash Flow"
            value={formatCurrency(stats.netCashFlow)}
            icon={DollarSign}
            trend={8}
            color="bg-blue-500"
          />
          <StatCard
            title="Financial Health"
            value={`${stats.financialHealthScore}/100`}
            icon={BarChart3}
            color="bg-purple-500"
          />
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <QuickAction
              title="Add Income"
              icon={Plus}
              color="bg-green-500"
              onClick={() => console.log('Add Income')}
            />
            <QuickAction
              title="Add Expense"
              icon={Plus}
              color="bg-red-500"
              onClick={() => console.log('Add Expense')}
            />
            <QuickAction
              title="Set Goal"
              icon={Target}
              color="bg-blue-500"
              onClick={() => console.log('Set Goal')}
            />
            <QuickAction
              title="Add Deadline"
              icon={Calendar}
              color="bg-orange-500"
              onClick={() => console.log('Add Deadline')}
            />
            <QuickAction
              title="View Reports"
              icon={BarChart3}
              color="bg-purple-500"
              onClick={() => console.log('View Reports')}
            />
            <QuickAction
              title="News Feed"
              icon={Newspaper}
              color="bg-indigo-500"
              onClick={() => console.log('News Feed')}
            />
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cash Flow Chart */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cash Flow Overview</h3>
              <div className="space-y-4">
                {cashFlowData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-700">{item.month}</span>
                    <div className="flex items-center space-x-6">
                      <span className="text-green-600 font-medium">{formatCurrency(item.income)}</span>
                      <span className="text-red-600 font-medium">{formatCurrency(item.expenses)}</span>
                      <span className={`font-bold ${item.netFlow >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {formatCurrency(item.netFlow)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Upcoming Deadlines */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-orange-500" />
                Upcoming Deadlines
              </h3>
              <div className="space-y-3">
                {upcomingDeadlines.map((deadline) => (
                  <div key={deadline.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{deadline.title}</p>
                      <p className="text-sm text-gray-600">{deadline.daysLeft} days left</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{formatCurrency(deadline.amount)}</p>
                      <p className="text-xs text-gray-500">{deadline.dueDate}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Expense Categories */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <PiggyBank className="w-5 h-5 mr-2 text-blue-500" />
                Expense Breakdown
              </h3>
              <div className="space-y-3">
                {expenseCategories.map((category, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-3"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-sm font-medium text-gray-700">{category.category}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(category.amount)}</p>
                      <p className="text-xs text-gray-500">{category.percentage}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial News */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Newspaper className="w-5 h-5 mr-2 text-indigo-500" />
                Financial News
              </h3>
              <div className="space-y-3">
                {recentNews.map((news) => (
                  <div key={news.id} className="p-3 bg-indigo-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-900 mb-1">{news.title}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">{news.source}</span>
                      <span className="text-xs text-indigo-600 font-medium">
                        {Math.round(news.relevance * 100)}% relevant
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}