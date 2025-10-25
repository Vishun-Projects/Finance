'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Target, TrendingUp, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatCurrency, formatDate, calculatePercentage } from '@/lib/utils'
import { Goal, CreateGoalForm } from '@/types'

/**
 * Renders the goals page, which allows users to set and track their financial goals.
 *
 * @returns {JSX.Element} The rendered goals page.
 */
export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<CreateGoalForm>({
    title: '',
    targetAmount: 0,
    targetDate: undefined,
    priority: 'MEDIUM',
    description: '',
  })

  // Mock data for demonstration
  useEffect(() => {
    setGoals([
      {
        id: '1',
        title: 'Buy MacBook Pro',
        targetAmount: 150000,
        currentAmount: 75000,
        targetDate: new Date('2024-06-01'),
        priority: 'HIGH',
        category: 'Electronics',
        description: 'Latest MacBook Pro for work and development',
        isActive: true,
        userId: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        title: 'Trip to Bali',
        targetAmount: 80000,
        currentAmount: 40000,
        targetDate: new Date('2024-12-01'),
        priority: 'MEDIUM',
        category: 'Travel',
        description: 'Dream vacation to Bali with family',
        isActive: true,
        userId: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '3',
        title: 'Emergency Fund',
        targetAmount: 300000,
        currentAmount: 200000,
        targetDate: new Date('2024-03-01'),
        priority: 'CRITICAL',
        category: 'Savings',
        description: '6 months of living expenses',
        isActive: true,
        userId: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newGoal: Goal = {
      id: Date.now().toString(),
      ...formData,
      currentAmount: 0,
      isActive: true,
      userId: 'user1',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setGoals([newGoal, ...goals])
    setFormData({
      title: '',
      targetAmount: 0,
      targetDate: undefined,
      priority: 'MEDIUM',
      description: '',
    })
    setShowForm(false)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'text-red-600 bg-red-100'
      case 'HIGH': return 'text-orange-600 bg-orange-100'
      case 'MEDIUM': return 'text-blue-600 bg-blue-100'
      case 'LOW': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getDaysUntil = (targetDate: Date) => {
    const today = new Date()
    const diffTime = targetDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const totalTargetAmount = goals.reduce((sum, goal) => sum + goal.targetAmount, 0)
  const totalCurrentAmount = goals.reduce((sum, goal) => sum + goal.currentAmount, 0)
  const overallProgress = calculatePercentage(totalCurrentAmount, totalTargetAmount)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Financial Goals</h1>
              <p className="text-gray-600 mt-2">Set and track your financial goals and dreams</p>
            </div>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Goal
            </Button>
          </div>
        </div>

        {/* Summary Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="w-5 h-5 mr-2 text-blue-600" />
              Goals Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Target</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalTargetAmount)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Saved</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalCurrentAmount)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Overall Progress</p>
                <p className="text-2xl font-bold text-gray-900">{overallProgress}%</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Active Goals</p>
                <p className="text-2xl font-bold text-gray-900">{goals.length}</p>
              </div>
            </div>
            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Progress</span>
                <span>{overallProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Goals Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {goals.map((goal) => {
            const progress = calculatePercentage(goal.currentAmount, goal.targetAmount)
            const daysLeft = goal.targetDate ? getDaysUntil(goal.targetDate) : null
            const remainingAmount = goal.targetAmount - goal.currentAmount

            return (
              <Card key={goal.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{goal.title}</CardTitle>
                      <div className="flex items-center space-x-2 mt-2">
                        <span 
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(goal.priority)}`}
                        >
                          {goal.priority}
                        </span>
                        {goal.category && (
                          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                            {goal.category}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Amount Details */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Target Amount</p>
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(goal.targetAmount)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Current Amount</p>
                        <p className="text-lg font-bold text-green-600">{formatCurrency(goal.currentAmount)}</p>
                      </div>
                    </div>

                    {/* Remaining Amount */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-gray-600">Remaining</p>
                      <p className="text-lg font-bold text-gray-900">{formatCurrency(remainingAmount)}</p>
                    </div>

                    {/* Timeline */}
                    {goal.targetDate && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>Target: {formatDate(goal.targetDate)}</span>
                        {daysLeft !== null && (
                          <span className={`font-medium ${daysLeft < 30 ? 'text-red-600' : 'text-gray-600'}`}>
                            ({daysLeft} days left)
                          </span>
                        )}
                      </div>
                    )}

                    {/* Description */}
                    {goal.description && (
                      <p className="text-sm text-gray-600">{goal.description}</p>
                    )}

                    {/* Add Progress Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => console.log('Add progress to', goal.title)}
                    >
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Add Progress
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Add Goal Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h2 className="text-xl font-bold mb-4">Add Financial Goal</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Goal Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Amount
                  </label>
                  <input
                    type="number"
                    value={formData.targetAmount}
                    onChange={(e) => setFormData({ ...formData, targetAmount: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.targetDate ? formData.targetDate.toISOString().split('T')[0] : ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      targetDate: e.target.value ? new Date(e.target.value) : undefined 
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.category || ''}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Travel, Electronics, Savings"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Describe your goal..."
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <Button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Add Goal
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}