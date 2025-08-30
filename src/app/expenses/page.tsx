'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, TrendingDown, Filter, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Expense, CreateExpenseForm } from '@/types'

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [showForm, setShowForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [formData, setFormData] = useState<CreateExpenseForm>({
    amount: 0,
    description: '',
    date: new Date(),
    isRecurring: false,
    notes: '',
  })

  // Mock data for demonstration
  useEffect(() => {
    setExpenses([
      {
        id: '1',
        amount: 15000,
        description: 'Rent Payment',
        date: new Date('2024-01-01'),
        categoryId: 'cat1',
        isRecurring: true,
        frequency: 'MONTHLY',
        notes: 'Monthly rent for apartment',
        userId: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
        category: {
          id: 'cat1',
          name: 'Housing',
          type: 'EXPENSE',
          color: '#3B82F6',
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      {
        id: '2',
        amount: 8000,
        description: 'Grocery Shopping',
        date: new Date('2024-01-02'),
        categoryId: 'cat2',
        isRecurring: false,
        notes: 'Weekly groceries',
        userId: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
        category: {
          id: 'cat2',
          name: 'Food',
          type: 'EXPENSE',
          color: '#10B981',
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      {
        id: '3',
        amount: 2500,
        description: 'Electricity Bill',
        date: new Date('2024-01-03'),
        categoryId: 'cat3',
        isRecurring: true,
        frequency: 'MONTHLY',
        notes: 'Monthly electricity bill',
        userId: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
        category: {
          id: 'cat3',
          name: 'Utilities',
          type: 'EXPENSE',
          color: '#8B5CF6',
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    ])
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newExpense: Expense = {
      id: Date.now().toString(),
      ...formData,
      userId: 'user1',
      createdAt: new Date(),
      updatedAt: new Date(),
      category: {
        id: 'cat1',
        name: 'Housing',
        type: 'EXPENSE',
        color: '#3B82F6',
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }
    setExpenses([newExpense, ...expenses])
    setFormData({
      amount: 0,
      description: '',
      date: new Date(),
      isRecurring: false,
      notes: '',
    })
    setShowForm(false)
  }

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || expense.categoryId === selectedCategory
    return matchesSearch && matchesCategory
  })

  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const categories = Array.from(new Set(expenses.map(e => e.category?.name).filter(Boolean)))

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Expenses</h1>
              <p className="text-gray-600 mt-2">Track your spending and manage your expenses</p>
            </div>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Expense
            </Button>
          </div>
        </div>

        {/* Summary Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingDown className="w-5 h-5 mr-2 text-red-600" />
              Expense Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalExpenses)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalExpenses)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{filteredExpenses.length}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Average per Transaction</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredExpenses.length > 0 ? formatCurrency(totalExpenses / filteredExpenses.length) : '₹0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search expenses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expenses List */}
        <div className="space-y-4">
          {filteredExpenses.map((expense) => (
            <Card key={expense.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold text-gray-900">{expense.description}</h3>
                      {expense.isRecurring && (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          Recurring
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                      <span>{formatDate(expense.date)}</span>
                      {expense.category && (
                        <span 
                          className="px-2 py-1 text-xs font-medium rounded-full"
                          style={{ 
                            backgroundColor: expense.category.color + '20',
                            color: expense.category.color 
                          }}
                        >
                          {expense.category.name}
                        </span>
                      )}
                    </div>
                    {expense.notes && (
                      <p className="text-sm text-gray-600 mt-2">{expense.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-xl font-bold text-gray-900">
                      {formatCurrency(expense.amount)}
                    </span>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add Expense Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h2 className="text-xl font-bold mb-4">Add Expense</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.date.toISOString().split('T')[0]}
                    onChange={(e) => setFormData({ ...formData, date: new Date(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="recurring"
                    checked={formData.isRecurring}
                    onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="recurring" className="ml-2 block text-sm text-gray-900">
                    Recurring Expense
                  </label>
                </div>
                {formData.isRecurring && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Frequency
                    </label>
                    <select
                      value={formData.frequency || 'MONTHLY'}
                      onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="DAILY">Daily</option>
                      <option value="WEEKLY">Weekly</option>
                      <option value="MONTHLY">Monthly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                  </div>
                )}
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
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  >
                    Add Expense
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