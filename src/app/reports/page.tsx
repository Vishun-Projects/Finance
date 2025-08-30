'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { BarChart3, TrendingUp, PieChart } from 'lucide-react'

export default function ReportsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Financial Reports</h1>
          <p className="text-gray-600 mt-2">Detailed financial analysis and insights</p>
        </div>

        {/* Coming Soon Card */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-6 h-6 mr-2 text-purple-600" />
              Coming Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <PieChart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Advanced Analytics & Reports</h3>
              <p className="text-gray-600 mb-6">
                Get comprehensive financial reports and insights to make better decisions.
              </p>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 mr-2 text-purple-500" />
                  <span>Monthly/yearly financial reports</span>
                </div>
                <div className="flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 mr-2 text-purple-500" />
                  <span>Spending pattern analysis</span>
                </div>
                <div className="flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 mr-2 text-purple-500" />
                  <span>Cash flow projections</span>
                </div>
                <div className="flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 mr-2 text-purple-500" />
                  <span>AI-powered recommendations</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}