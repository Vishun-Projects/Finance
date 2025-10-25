'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Calendar, Clock, AlertTriangle } from 'lucide-react'

/**
 * Renders the deadlines page, which is currently a "Coming Soon" placeholder.
 *
 * @returns {JSX.Element} The rendered deadlines page.
 */
export default function DeadlinesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Deadlines & Obligations</h1>
          <p className="text-gray-600 mt-2">Track your bills, EMIs, and financial deadlines</p>
        </div>

        {/* Coming Soon Card */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-6 h-6 mr-2 text-orange-600" />
              Coming Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Deadlines Management</h3>
              <p className="text-gray-600 mb-6">
                Track your bills, EMIs, subscriptions, and other financial obligations with smart reminders.
              </p>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 mr-2 text-orange-500" />
                  <span>Bill payment reminders</span>
                </div>
                <div className="flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 mr-2 text-orange-500" />
                  <span>EMI due date tracking</span>
                </div>
                <div className="flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 mr-2 text-orange-500" />
                  <span>Subscription management</span>
                </div>
                <div className="flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 mr-2 text-orange-500" />
                  <span>Payment status tracking</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}