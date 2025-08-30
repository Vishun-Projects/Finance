'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { IncomeSource, CreateIncomeSourceForm } from '@/types'

export default function IncomePage() {
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<CreateIncomeSourceForm>({
    name: '',
    amount: 0,
    frequency: 'MONTHLY',
    startDate: new Date(),
    notes: '',
  })

  // Mock data for demonstration
  useEffect(() => {
    setIncomeSources([
      {
        id: '1',
        name: 'Salary',
        amount: 75000,
        frequency: 'MONTHLY',
        startDate: new Date('2024-01-01'),
        endDate: null,
        notes: 'Primary job salary',
        isActive: true,
        userId: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
        category: {
          id: 'cat1',
          name: 'Employment',
          type: 'INCOME',
          color: '#10B981',
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      {
        id: '2',
        name: 'Freelance Projects',
        amount: 25000,
        frequency: 'MONTHLY',
        startDate: new Date('2024-01-01'),
        endDate: null,
        notes: 'Side projects and consulting',
        isActive: true,
        userId: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
        category: {
          id: 'cat2',
          name: 'Freelance',
          type: 'INCOME',
          color: '#3B82F6',
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    ])
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newIncomeSource: IncomeSource = {
      id: Date.now().toString(),
      ...formData,
      isActive: true,
      userId: 'user1',
      createdAt: new Date(),
      updatedAt: new Date(),
      category: {
        id: 'cat1',
        name: 'Employment',
        type: 'INCOME',
        color: '#10B981',
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }
    setIncomeSources([newIncomeSource, ...incomeSources])
    setFormData({
      name: '',
      amount: 0,
      frequency: 'MONTHLY',
      startDate: new Date(),
      notes: '',
    })
    setShowForm(false)
  }

  const totalIncome = incomeSources.reduce((sum, source) => {
    const multiplier = source.frequency === 'MONTHLY' ? 1 : 
                     source.frequency === 'WEEKLY' ? 4.33 : 
                     source.frequency === 'DAILY' ? 30 : 
                     source.frequency === 'YEARLY' ? 1/12 : 1
    return sum + (source.amount * multiplier)
  }, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Income Sources</h1>
              <p className="text-gray-600 mt-2">Manage your income streams and track your earnings</p>
            </div>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Income Source
            </Button>
          </div>
        </div>

        {/* Summary Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
              Monthly Income Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Monthly Income</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalIncome)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Active Sources</p>
                <p className="text-2xl font-bold text-gray-900">{incomeSources.length}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Average per Source</p>
                <p className="text-2xl font-bold text-gray-900">
                  {incomeSources.length > 0 ? formatCurrency(totalIncome / incomeSources.length) : '₹0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Income Sources List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {incomeSources.map((source) => (
            <Card key={source.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{source.name}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {source.frequency} • Started {formatDate(source.startDate)}
                    </p>
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
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Amount</span>
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(source.amount)}
                    </span>
                  </div>
                  {source.category && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Category</span>
                      <span 
                        className="px-2 py-1 text-xs font-medium rounded-full"
                        style={{ 
                          backgroundColor: source.category.color + '20',
                          color: source.category.color 
                        }}
                      >
                        {source.category.name}
                      </span>
                    </div>
                  )}
                  {source.notes && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">Notes</span>
                      <p className="text-sm text-gray-700 mt-1">{source.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add Income Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h2 className="text-xl font-bold mb-4">Add Income Source</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Income Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount
                  </label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequency
                  </label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ONE_TIME">One Time</option>
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate.toISOString().split('T')[0]}
                    onChange={(e) => setFormData({ ...formData, startDate: new Date(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <Button
                    type="submit"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    Add Income Source
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