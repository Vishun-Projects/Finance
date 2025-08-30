'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Newspaper, TrendingUp, Globe } from 'lucide-react'

export default function NewsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Financial News</h1>
          <p className="text-gray-600 mt-2">Stay updated with relevant financial news and market insights</p>
        </div>

        {/* Coming Soon Card */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Newspaper className="w-6 h-6 mr-2 text-indigo-600" />
              Coming Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Globe className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Financial News Integration</h3>
              <p className="text-gray-600 mb-6">
                Get personalized financial news and insights that impact your personal finances.
              </p>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 mr-2 text-indigo-500" />
                  <span>Real-time financial news</span>
                </div>
                <div className="flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 mr-2 text-indigo-500" />
                  <span>Personalized relevance scoring</span>
                </div>
                <div className="flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 mr-2 text-indigo-500" />
                  <span>Market impact analysis</span>
                </div>
                <div className="flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 mr-2 text-indigo-500" />
                  <span>AI-powered insights</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}