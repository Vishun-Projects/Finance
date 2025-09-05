'use client';

import React, { useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  User, 
  Bell, 
  Shield, 
  Database, 
  Eye, 
  Info,
  Save,
  CheckCircle,
  Settings
} from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('appearance');
  const [loading, setLoading] = useState(false);
  const [savedSections, setSavedSections] = useState<Record<string, boolean>>({});
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  const handleSave = async (section: string) => {
    if (!user?.id) {
      console.error('No user ID available');
      return;
    }

    setLoading(true);
    try {
      console.log('Saving preferences:', {
        userId: user.id,
        navigationLayout: 'top',
        theme: theme,
        colorScheme: 'default'
      });

      // Save to database
      const response = await fetch('/api/user-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          navigationLayout: 'top', // Fixed to top navbar
          theme: theme,
          colorScheme: 'default'
        })
      });

      console.log('Response status:', response.status);
      const responseData = await response.json();
      console.log('Response data:', responseData);

      if (response.ok) {
        // Show success message
        setSavedSections(prev => ({ ...prev, [section]: true }));
        setTimeout(() => {
          setSavedSections(prev => ({ ...prev, [section]: false }));
        }, 3000);
      } else {
        console.error('Failed to save preferences:', responseData);
        alert(`Failed to save preferences: ${responseData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Network error while saving preferences');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please log in to access settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background container-padding">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="section-spacing">
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-2">Configure your account and preferences</p>
        </div>

        {/* Tabs */}
        <div className="minimal-card shadow-soft">
          <div className="border-b border-border">
            <nav className="flex space-x-8 px-6">
              {['appearance', 'profile', 'notifications', 'security'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm capitalize transition-smooth ${
                    activeTab === tab
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="card-spacing">
            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-4">Appearance Settings</h3>
                  
                  {/* Theme Selection */}
                  <div className="minimal-card-inset card-spacing">
                    <label className="block text-sm font-medium text-muted-foreground mb-2">Theme</label>
                    <select 
                      className="minimal-select"
                      value={theme}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTheme(e.target.value as 'light' | 'dark' | 'high-contrast')}
                    >
                      <option value="light">Light Theme</option>
                      <option value="dark">Dark Theme</option>
                      <option value="high-contrast">High Contrast</option>
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">Choose your preferred color theme</p>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleSave('Appearance')}
                      disabled={loading}
                      className="minimal-button-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Success Message */}
                  {savedSections['Appearance'] && (
                    <div className="flex items-center space-x-2 text-success bg-success/10 p-3 rounded-lg border border-success/20 fade-in">
                      <CheckCircle className="w-5 h-5" />
                      <span>Appearance settings saved successfully!</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Other tabs - Coming Soon */}
            {activeTab !== 'appearance' && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Settings className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">Coming Soon</h3>
                <p className="text-muted-foreground">
                  {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} settings will be available soon.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
