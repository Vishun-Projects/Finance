'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Settings, User, Shield, Bell } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">Configure your account and preferences</p>
        </div>

        {/* Coming Soon Card */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="w-6 h-6 mr-2 text-gray-600" />
              Coming Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Account Settings</h3>
              <p className="text-gray-600 mb-6">
                Manage your account settings, preferences, and security options.
              </p>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-center justify-center">
                  <User className="w-4 h-4 mr-2 text-gray-500" />
                  <span>Profile management</span>
                </div>
                <div className="flex items-center justify-center">
                  <Shield className="w-4 h-4 mr-2 text-gray-500" />
                  <span>Security settings</span>
                </div>
                <div className="flex items-center justify-center">
                  <Bell className="w-4 h-4 mr-2 text-gray-500" />
                  <span>Notification preferences</span>
                </div>
                <div className="flex items-center justify-center">
                  <Settings className="w-4 h-4 mr-2 text-gray-500" />
                  <span>App preferences</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}