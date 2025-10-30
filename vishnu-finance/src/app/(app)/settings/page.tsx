'use client';

import React, { useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useCurrency } from '../../../contexts/CurrencyContext';
import { useToast } from '../../../contexts/ToastContext';
import { useNotifications } from '../../../lib/notifications';
import ToastTest from '../../../components/ToastTest';
import CurrencyTest from '../../../components/CurrencyTest';
import { 
  User, 
  Bell, 
  Shield, 
  Database, 
  Eye, 
  Info,
  Save,
  CheckCircle,
  Settings,
  Palette,
  Monitor,
  Moon,
  Sun,
  Contrast,
  Globe,
  Volume2,
  VolumeX,
  Mail,
  Smartphone,
  Lock,
  Key,
  Trash2,
  Download,
  Upload,
  FileText,
  BookOpen,
  DollarSign,
  Users,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('appearance');
  const [loading, setLoading] = useState(false);
  const [savedSections, setSavedSections] = useState<Record<string, boolean>>({});
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { selectedCurrency, setSelectedCurrency, formatCurrency, lastUpdated } = useCurrency();
  const { success, error: showError } = useToast();
  const { requestPermission, isSupported, permission } = useNotifications();

  // Additional settings state
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    sms: false,
    marketing: false
  });
  const [privacy, setPrivacy] = useState({
    profileVisibility: 'private',
    dataSharing: false,
    analytics: true
  });
  const [preferences, setPreferences] = useState({
    language: 'en',
    currency: selectedCurrency,
    dateFormat: 'DD/MM/YYYY',
    timezone: 'Asia/Kolkata'
  });

  const handleSave = async (section: string) => {
    if (!user?.id) {
      console.error('No user ID available');
      showError('Error', 'No user ID available');
      return;
    }

    setLoading(true);
    try {
      console.log('Saving preferences:', {
        userId: user.id,
        navigationLayout: 'top',
        theme: theme,
        colorScheme: 'default',
        currency: selectedCurrency,
        language: preferences.language,
        timezone: preferences.timezone,
        dateFormat: preferences.dateFormat
      });

      // Save to database
      const response = await fetch('/api/user-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          navigationLayout: 'top', // Fixed to top navbar
          theme: theme,
          colorScheme: 'default',
          currency: selectedCurrency,
          language: preferences.language,
          timezone: preferences.timezone,
          dateFormat: preferences.dateFormat
        })
      });

      console.log('Response status:', response.status);
      const responseData = await response.json();
      console.log('Response data:', responseData);

      if (response.ok) {
        // Show success message
        success('Settings Saved', `${section} settings have been saved successfully!`);
        setSavedSections(prev => ({ ...prev, [section]: true }));
        setTimeout(() => {
          setSavedSections(prev => ({ ...prev, [section]: false }));
        }, 3000);
      } else {
        console.error('Failed to save preferences:', responseData);
        showError('Save Failed', `Failed to save preferences: ${responseData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      showError('Network Error', 'Network error while saving preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationPermission = async () => {
    if (!isSupported) {
      showError('Not Supported', 'Desktop notifications are not supported in this browser');
      return;
    }

    try {
      const granted = await requestPermission();
      if (granted) {
        success('Permission Granted', 'Desktop notifications are now enabled');
        setNotifications(prev => ({ ...prev, push: true }));
      } else {
        showError('Permission Denied', 'Desktop notifications were blocked. Please enable them in your browser settings.');
      }
    } catch (err) {
      showError('Error', 'Failed to request notification permission');
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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-2">Configure your account and preferences</p>
        </div>

        {/* Test Components - Remove these after testing */}
        <ToastTest />
        <CurrencyTest />

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="appearance" className="flex items-center space-x-2">
              <Palette className="w-4 h-4" />
              <span>Appearance</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span>Profile</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center space-x-2">
              <Bell className="w-4 h-4" />
              <span>Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center space-x-2">
              <Shield className="w-4 h-4" />
              <span>Security</span>
            </TabsTrigger>
            <TabsTrigger value="documentation" className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Product Docs</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab Content */}
          <TabsContent value="appearance" className="space-y-6">
            {/* Theme Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Palette className="w-5 h-5" />
                  <span>Theme</span>
                </CardTitle>
                <CardDescription>
                  Choose your preferred color theme for the application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Light Theme */}
                  <Card 
                    className={`cursor-pointer transition-all ${
                      theme === 'light' 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:ring-1 hover:ring-primary/50'
                    }`}
                    onClick={() => setTheme('light')}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3 mb-3">
                        <Sun className="w-5 h-5 text-foreground" />
                        <span className="font-medium text-foreground">Light</span>
                        {theme === 'light' && <Badge variant="secondary">Active</Badge>}
                      </div>
                      <div className="w-full h-16 bg-white border border-gray-200 rounded flex items-center justify-center">
                        <div className="w-8 h-8 bg-gray-800 rounded"></div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Clean and bright interface</p>
                    </CardContent>
                  </Card>

                  {/* Dark Theme */}
                  <Card 
                    className={`cursor-pointer transition-all ${
                      theme === 'dark' 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:ring-1 hover:ring-primary/50'
                    }`}
                    onClick={() => setTheme('dark')}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3 mb-3">
                        <Moon className="w-5 h-5 text-foreground" />
                        <span className="font-medium text-foreground">Dark</span>
                        {theme === 'dark' && <Badge variant="secondary">Active</Badge>}
                      </div>
                      <div className="w-full h-16 bg-gray-800 border border-gray-600 rounded flex items-center justify-center">
                        <div className="w-8 h-8 bg-white rounded"></div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Easy on the eyes</p>
                    </CardContent>
                  </Card>

                  {/* High Contrast Theme */}
                  <Card 
                    className={`cursor-pointer transition-all ${
                      theme === 'high-contrast' 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:ring-1 hover:ring-primary/50'
                    }`}
                    onClick={() => setTheme('high-contrast')}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3 mb-3">
                        <Contrast className="w-5 h-5 text-foreground" />
                        <span className="font-medium text-foreground">High Contrast</span>
                        {theme === 'high-contrast' && <Badge variant="secondary">Active</Badge>}
                      </div>
                      <div className="w-full h-16 bg-black border-2 border-white rounded flex items-center justify-center">
                        <div className="w-8 h-8 bg-white rounded"></div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">Maximum accessibility</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            {/* Language & Region */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="w-5 h-5" />
                  <span>Language & Region</span>
                </CardTitle>
                <CardDescription>
                  Configure your language and currency preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select 
                      value={preferences.language} 
                      onValueChange={(value) => setPreferences(prev => ({ ...prev, language: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="hi">हिन्दी</SelectItem>
                        <SelectItem value="ta">தமிழ்</SelectItem>
                        <SelectItem value="te">తెలుగు</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select 
                      value={selectedCurrency} 
                      onValueChange={(value) => {
                        setSelectedCurrency(value);
                        setPreferences(prev => ({ ...prev, currency: value }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">Indian Rupee (₹)</SelectItem>
                        <SelectItem value="USD">US Dollar ($)</SelectItem>
                        <SelectItem value="EUR">Euro (€)</SelectItem>
                        <SelectItem value="GBP">British Pound (£)</SelectItem>
                        <SelectItem value="JPY">Japanese Yen (¥)</SelectItem>
                        <SelectItem value="CAD">Canadian Dollar (C$)</SelectItem>
                        <SelectItem value="AUD">Australian Dollar (A$)</SelectItem>
                        <SelectItem value="CHF">Swiss Franc (CHF)</SelectItem>
                        <SelectItem value="CNY">Chinese Yuan (¥)</SelectItem>
                        <SelectItem value="SEK">Swedish Krona (kr)</SelectItem>
                        <SelectItem value="NOK">Norwegian Krone (kr)</SelectItem>
                        <SelectItem value="DKK">Danish Krone (kr)</SelectItem>
                        <SelectItem value="PLN">Polish Zloty (zł)</SelectItem>
                        <SelectItem value="CZK">Czech Koruna (Kč)</SelectItem>
                        <SelectItem value="HUF">Hungarian Forint (Ft)</SelectItem>
                        <SelectItem value="RUB">Russian Ruble (₽)</SelectItem>
                        <SelectItem value="BRL">Brazilian Real (R$)</SelectItem>
                        <SelectItem value="MXN">Mexican Peso ($)</SelectItem>
                        <SelectItem value="KRW">South Korean Won (₩)</SelectItem>
                        <SelectItem value="SGD">Singapore Dollar (S$)</SelectItem>
                        <SelectItem value="HKD">Hong Kong Dollar (HK$)</SelectItem>
                        <SelectItem value="NZD">New Zealand Dollar (NZ$)</SelectItem>
                        <SelectItem value="ZAR">South African Rand (R)</SelectItem>
                        <SelectItem value="TRY">Turkish Lira (₺)</SelectItem>
                        <SelectItem value="AED">UAE Dirham (د.إ)</SelectItem>
                        <SelectItem value="SAR">Saudi Riyal (﷼)</SelectItem>
                        <SelectItem value="QAR">Qatari Riyal (﷼)</SelectItem>
                        <SelectItem value="KWD">Kuwaiti Dinar (د.ك)</SelectItem>
                        <SelectItem value="BHD">Bahraini Dinar (د.ب)</SelectItem>
                        <SelectItem value="OMR">Omani Rial (﷼)</SelectItem>
                        <SelectItem value="JOD">Jordanian Dinar (د.ا)</SelectItem>
                        <SelectItem value="LBP">Lebanese Pound (ل.ل)</SelectItem>
                        <SelectItem value="EGP">Egyptian Pound (£)</SelectItem>
                        <SelectItem value="MAD">Moroccan Dirham (د.م.)</SelectItem>
                        <SelectItem value="TND">Tunisian Dinar (د.ت)</SelectItem>
                        <SelectItem value="DZD">Algerian Dinar (د.ج)</SelectItem>
                        <SelectItem value="LYD">Libyan Dinar (ل.د)</SelectItem>
                        <SelectItem value="SDG">Sudanese Pound (ج.س.)</SelectItem>
                        <SelectItem value="ETB">Ethiopian Birr (Br)</SelectItem>
                        <SelectItem value="KES">Kenyan Shilling (KSh)</SelectItem>
                        <SelectItem value="UGX">Ugandan Shilling (USh)</SelectItem>
                        <SelectItem value="TZS">Tanzanian Shilling (TSh)</SelectItem>
                        <SelectItem value="MWK">Malawian Kwacha (MK)</SelectItem>
                        <SelectItem value="ZMW">Zambian Kwacha (ZK)</SelectItem>
                        <SelectItem value="BWP">Botswana Pula (P)</SelectItem>
                        <SelectItem value="SZL">Swazi Lilangeni (L)</SelectItem>
                        <SelectItem value="LSL">Lesotho Loti (L)</SelectItem>
                        <SelectItem value="NAD">Namibian Dollar (N$)</SelectItem>
                        <SelectItem value="MUR">Mauritian Rupee (₨)</SelectItem>
                        <SelectItem value="SCR">Seychellois Rupee (₨)</SelectItem>
                        <SelectItem value="MVR">Maldivian Rufiyaa (ރ)</SelectItem>
                        <SelectItem value="LKR">Sri Lankan Rupee (₨)</SelectItem>
                        <SelectItem value="BDT">Bangladeshi Taka (৳)</SelectItem>
                        <SelectItem value="NPR">Nepalese Rupee (₨)</SelectItem>
                        <SelectItem value="PKR">Pakistani Rupee (₨)</SelectItem>
                        <SelectItem value="AFN">Afghan Afghani (؋)</SelectItem>
                        <SelectItem value="IRR">Iranian Rial (﷼)</SelectItem>
                        <SelectItem value="IQD">Iraqi Dinar (ع.د)</SelectItem>
                        <SelectItem value="SYP">Syrian Pound (£)</SelectItem>
                        <SelectItem value="YER">Yemeni Rial (﷼)</SelectItem>
                        <SelectItem value="ILS">Israeli Shekel (₪)</SelectItem>
                        <SelectItem value="PEN">Peruvian Sol (S/)</SelectItem>
                        <SelectItem value="CLP">Chilean Peso ($)</SelectItem>
                        <SelectItem value="COP">Colombian Peso ($)</SelectItem>
                        <SelectItem value="ARS">Argentine Peso ($)</SelectItem>
                        <SelectItem value="UYU">Uruguayan Peso ($U)</SelectItem>
                        <SelectItem value="PYG">Paraguayan Guarani (₲)</SelectItem>
                        <SelectItem value="BOB">Bolivian Boliviano (Bs)</SelectItem>
                        <SelectItem value="VES">Venezuelan Bolivar (Bs.S)</SelectItem>
                        <SelectItem value="VEF">Venezuelan Bolivar (Bs)</SelectItem>
                        <SelectItem value="GYD">Guyanese Dollar (G$)</SelectItem>
                        <SelectItem value="SRD">Surinamese Dollar ($)</SelectItem>
                        <SelectItem value="TTD">Trinidad and Tobago Dollar (TT$)</SelectItem>
                        <SelectItem value="BBD">Barbadian Dollar (Bds$)</SelectItem>
                        <SelectItem value="JMD">Jamaican Dollar (J$)</SelectItem>
                        <SelectItem value="XCD">East Caribbean Dollar ($)</SelectItem>
                        <SelectItem value="AWG">Aruban Florin (ƒ)</SelectItem>
                        <SelectItem value="BZD">Belize Dollar (BZ$)</SelectItem>
                        <SelectItem value="GTQ">Guatemalan Quetzal (Q)</SelectItem>
                        <SelectItem value="HNL">Honduran Lempira (L)</SelectItem>
                        <SelectItem value="NIO">Nicaraguan Cordoba (C$)</SelectItem>
                        <SelectItem value="CRC">Costa Rican Colon (₡)</SelectItem>
                        <SelectItem value="PAB">Panamanian Balboa (B/.)</SelectItem>
                        <SelectItem value="DOP">Dominican Peso (RD$)</SelectItem>
                        <SelectItem value="HTG">Haitian Gourde (G)</SelectItem>
                        <SelectItem value="CUP">Cuban Peso ($)</SelectItem>
                        <SelectItem value="BMD">Bermudian Dollar ($)</SelectItem>
                        <SelectItem value="KYD">Cayman Islands Dollar ($)</SelectItem>
                        <SelectItem value="BSD">Bahamian Dollar ($)</SelectItem>
                      </SelectContent>
                    </Select>
                    {lastUpdated && (
                      <p className="text-xs text-muted-foreground">
                        Exchange rates last updated: {lastUpdated.toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                onClick={() => handleSave('Appearance')}
                disabled={loading}
                className="flex items-center space-x-2"
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
              </Button>
            </div>

            {/* Success Message */}
            {savedSections['Appearance'] && (
              <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg border border-green-200">
                <CheckCircle className="w-5 h-5" />
                <span>Appearance settings saved successfully!</span>
              </div>
            )}
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            {/* Email Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="w-5 h-5" />
                  <span>Email Notifications</span>
                </CardTitle>
                <CardDescription>
                  Configure your email notification preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="transaction-alerts">Transaction Alerts</Label>
                    <p className="text-sm text-muted-foreground">Get notified about new transactions</p>
                  </div>
                  <Switch
                    id="transaction-alerts"
                    checked={notifications.email}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, email: checked }))}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="marketing-emails">Marketing Emails</Label>
                    <p className="text-sm text-muted-foreground">Receive updates about new features</p>
                  </div>
                  <Switch
                    id="marketing-emails"
                    checked={notifications.marketing}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, marketing: checked }))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Push Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Smartphone className="w-5 h-5" />
                  <span>Push Notifications</span>
                </CardTitle>
                <CardDescription>
                  Configure browser and mobile notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="browser-notifications">Browser Notifications</Label>
                    <p className="text-sm text-muted-foreground">Show notifications in your browser</p>
                    {!isSupported && (
                      <p className="text-xs text-red-500">Notifications not supported in this browser</p>
                    )}
                    {isSupported && permission === 'denied' && (
                      <p className="text-xs text-red-500">Notifications blocked. Please enable in browser settings.</p>
                    )}
                    {isSupported && permission === 'granted' && (
                      <p className="text-xs text-green-500">Notifications enabled</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {isSupported && permission !== 'granted' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNotificationPermission}
                      >
                        Enable Notifications
                      </Button>
                    )}
                  <Switch
                    id="browser-notifications"
                      checked={notifications.push && permission === 'granted'}
                      onCheckedChange={(checked) => {
                        if (checked && permission !== 'granted') {
                          handleNotificationPermission();
                        } else {
                          setNotifications(prev => ({ ...prev, push: checked }));
                        }
                      }}
                      disabled={!isSupported}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                onClick={() => handleSave('Notifications')}
                disabled={loading}
                className="flex items-center space-x-2"
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
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>Personal Information</span>
                </CardTitle>
                <CardDescription>
                  Update your personal details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input 
                      id="name" 
                      type="text" 
                      defaultValue={user?.name || ''} 
                      placeholder="Enter your name" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      defaultValue={user?.email || ''} 
                      placeholder="Enter your email" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input 
                    id="phone" 
                    type="tel" 
                    placeholder="Enter your phone number" 
                  />
                </div>
                <Button className="flex items-center space-x-2">
                  <Save className="w-4 h-4" />
                  <span>Update Profile</span>
                </Button>
              </CardContent>
            </Card>

            {/* Data Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Download className="w-5 h-5" />
                  <span>Data Management</span>
                </CardTitle>
                <CardDescription>
                  Export your data or manage your account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Export Data</Label>
                    <p className="text-sm text-muted-foreground">Download all your financial data</p>
                  </div>
                  <Button variant="outline" className="flex items-center space-x-2">
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            {/* Password */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lock className="w-5 h-5" />
                  <span>Password</span>
                </CardTitle>
                <CardDescription>
                  Change your account password
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input id="current-password" type="password" placeholder="Enter current password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input id="new-password" type="password" placeholder="Enter new password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input id="confirm-password" type="password" placeholder="Confirm new password" />
                </div>
                <Button className="flex items-center space-x-2">
                  <Key className="w-4 h-4" />
                  <span>Change Password</span>
                </Button>
              </CardContent>
            </Card>

            {/* Privacy Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span>Privacy</span>
                </CardTitle>
                <CardDescription>
                  Control your privacy and data sharing preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="data-sharing">Data Sharing</Label>
                    <p className="text-sm text-muted-foreground">Allow anonymous usage data collection</p>
                  </div>
                  <Switch
                    id="data-sharing"
                    checked={privacy.dataSharing}
                    onCheckedChange={(checked) => setPrivacy(prev => ({ ...prev, dataSharing: checked }))}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="analytics">Analytics</Label>
                    <p className="text-sm text-muted-foreground">Help improve the app with usage analytics</p>
                  </div>
                  <Switch
                    id="analytics"
                    checked={privacy.analytics}
                    onCheckedChange={(checked) => setPrivacy(prev => ({ ...prev, analytics: checked }))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-red-600">
                  <Trash2 className="w-5 h-5" />
                  <span>Danger Zone</span>
                </CardTitle>
                <CardDescription>
                  Irreversible and destructive actions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Delete Account</Label>
                    <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
                  </div>
                  <Button variant="destructive" className="flex items-center space-x-2">
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Account</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documentation" className="space-y-6">
            {/* Product Documentation Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BookOpen className="w-5 h-5" />
                  <span>Product Documentation</span>
                </CardTitle>
                <CardDescription>
                  Complete set of documents for selling the Personal Finance Dashboard as a product
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">7 Documents Completed</p>
                      <p className="text-sm text-green-600">Ready for sales</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <Clock className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="font-medium text-orange-800">8 Documents Pending</p>
                      <p className="text-sm text-orange-600">In progress</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Completed Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span>Completed Documents</span>
                </CardTitle>
                <CardDescription>
                  These documents are ready for use in sales and client presentations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* README */}
                  <div className="flex items-center justify-between p-4 border border-green-200 rounded-lg bg-green-50">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium">README.md</p>
                        <p className="text-sm text-muted-foreground">Product documentation index</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">Complete</Badge>
                  </div>

                  {/* Product Brief */}
                  <div className="flex items-center justify-between p-4 border border-green-200 rounded-lg bg-green-50">
                    <div className="flex items-center space-x-3">
                      <BookOpen className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium">PRODUCT_BRIEF.md</p>
                        <p className="text-sm text-muted-foreground">Executive summary & value proposition</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">Complete</Badge>
                  </div>

                  {/* Features & Modules */}
                  <div className="flex items-center justify-between p-4 border border-green-200 rounded-lg bg-green-50">
                    <div className="flex items-center space-x-3">
                      <Settings className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium">FEATURES_MODULES.md</p>
                        <p className="text-sm text-muted-foreground">Detailed feature breakdown</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">Complete</Badge>
                  </div>

                  {/* Pricing Packages */}
                  <div className="flex items-center justify-between p-4 border border-green-200 rounded-lg bg-green-50">
                    <div className="flex items-center space-x-3">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium">PRICING_PACKAGES.md</p>
                        <p className="text-sm text-muted-foreground">Pricing tiers & commercial terms</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">Complete</Badge>
                  </div>

                  {/* Sales Proposal */}
                  <div className="flex items-center justify-between p-4 border border-green-200 rounded-lg bg-green-50">
                    <div className="flex items-center space-x-3">
                      <Users className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium">SALES_PROPOSAL_TEMPLATE.md</p>
                        <p className="text-sm text-muted-foreground">Standard proposal template</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">Complete</Badge>
                  </div>

                  {/* Order Form */}
                  <div className="flex items-center justify-between p-4 border border-green-200 rounded-lg bg-green-50">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium">ORDER_FORM.md</p>
                        <p className="text-sm text-muted-foreground">Customer order & agreement form</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">Complete</Badge>
                  </div>

                  {/* FAQ */}
                  <div className="flex items-center justify-between p-4 border border-green-200 rounded-lg bg-green-50">
                    <div className="flex items-center space-x-3">
                      <Info className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium">FAQ.md</p>
                        <p className="text-sm text-muted-foreground">Frequently asked questions</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">Complete</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pending Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  <span>Pending Documents</span>
                </CardTitle>
                <CardDescription>
                  These documents need to be created to complete the product documentation suite
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Implementation Guide */}
                  <div className="flex items-center justify-between p-4 border border-orange-200 rounded-lg bg-orange-50">
                    <div className="flex items-center space-x-3">
                      <Settings className="w-5 h-5 text-orange-600" />
                      <div>
                        <p className="font-medium">IMPLEMENTATION_GUIDE.md</p>
                        <p className="text-sm text-muted-foreground">Onboarding & setup process</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">Pending</Badge>
                  </div>

                  {/* Support Policy */}
                  <div className="flex items-center justify-between p-4 border border-orange-200 rounded-lg bg-orange-50">
                    <div className="flex items-center space-x-3">
                      <Bell className="w-5 h-5 text-orange-600" />
                      <div>
                        <p className="font-medium">SUPPORT_POLICY.md</p>
                        <p className="text-sm text-muted-foreground">Support levels & response times</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">Pending</Badge>
                  </div>

                  {/* Terms of Service */}
                  <div className="flex items-center justify-between p-4 border border-orange-200 rounded-lg bg-orange-50">
                    <div className="flex items-center space-x-3">
                      <Shield className="w-5 h-5 text-orange-600" />
                      <div>
                        <p className="font-medium">TERMS_OF_SERVICE.md</p>
                        <p className="text-sm text-muted-foreground">Terms & conditions</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">Pending</Badge>
                  </div>

                  {/* Privacy Policy */}
                  <div className="flex items-center justify-between p-4 border border-orange-200 rounded-lg bg-orange-50">
                    <div className="flex items-center space-x-3">
                      <Lock className="w-5 h-5 text-orange-600" />
                      <div>
                        <p className="font-medium">PRIVACY_POLICY.md</p>
                        <p className="text-sm text-muted-foreground">Data handling & privacy</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">Pending</Badge>
                  </div>

                  {/* Service Level Agreement */}
                  <div className="flex items-center justify-between p-4 border border-orange-200 rounded-lg bg-orange-50">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-orange-600" />
                      <div>
                        <p className="font-medium">SERVICE_LEVEL_AGREEMENT.md</p>
                        <p className="text-sm text-muted-foreground">SLA terms & uptime guarantees</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">Pending</Badge>
                  </div>

                  {/* Data Processing Agreement */}
                  <div className="flex items-center justify-between p-4 border border-orange-200 rounded-lg bg-orange-50">
                    <div className="flex items-center space-x-3">
                      <Database className="w-5 h-5 text-orange-600" />
                      <div>
                        <p className="font-medium">DATA_PROCESSING_AGREEMENT.md</p>
                        <p className="text-sm text-muted-foreground">Data processing & security terms</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">Pending</Badge>
                  </div>

                  {/* Security Overview */}
                  <div className="flex items-center justify-between p-4 border border-orange-200 rounded-lg bg-orange-50">
                    <div className="flex items-center space-x-3">
                      <Shield className="w-5 h-5 text-orange-600" />
                      <div>
                        <p className="font-medium">SECURITY_OVERVIEW.md</p>
                        <p className="text-sm text-muted-foreground">Security measures & compliance</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">Pending</Badge>
                  </div>

                  {/* Compliance Checklist */}
                  <div className="flex items-center justify-between p-4 border border-orange-200 rounded-lg bg-orange-50">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-orange-600" />
                      <div>
                        <p className="font-medium">COMPLIANCE_CHECKLIST.md</p>
                        <p className="text-sm text-muted-foreground">Regulatory compliance requirements</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">Pending</Badge>
                  </div>

                  {/* Demo Script */}
                  <div className="flex items-center justify-between p-4 border border-orange-200 rounded-lg bg-orange-50">
                    <div className="flex items-center space-x-3">
                      <Eye className="w-5 h-5 text-orange-600" />
                      <div>
                        <p className="font-medium">DEMO_SCRIPT.md</p>
                        <p className="text-sm text-muted-foreground">Product demonstration guide</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">Pending</Badge>
                  </div>

                  {/* Quote Template */}
                  <div className="flex items-center justify-between p-4 border border-orange-200 rounded-lg bg-orange-50">
                    <div className="flex items-center space-x-3">
                      <DollarSign className="w-5 h-5 text-orange-600" />
                      <div>
                        <p className="font-medium">QUOTE_TEMPLATE.md</p>
                        <p className="text-sm text-muted-foreground">Pricing quote template</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">Pending</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Document Usage Guide */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Info className="w-5 h-5" />
                  <span>Document Usage Guide</span>
                </CardTitle>
                <CardDescription>
                  How to use these documents effectively in your sales process
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center space-x-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span>Sales Process</span>
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Use PRODUCT_BRIEF for initial presentations</li>
                      <li>• Reference FEATURES_MODULES for detailed demos</li>
                      <li>• Present PRICING_PACKAGES for commercial discussions</li>
                      <li>• Use SALES_PROPOSAL_TEMPLATE for formal proposals</li>
                    </ul>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center space-x-2">
                      <Shield className="w-4 h-4 text-green-600" />
                      <span>Legal & Compliance</span>
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• TERMS_OF_SERVICE for contract negotiations</li>
                      <li>• PRIVACY_POLICY for data protection discussions</li>
                      <li>• SECURITY_OVERVIEW for security requirements</li>
                      <li>• COMPLIANCE_CHECKLIST for regulatory needs</li>
                    </ul>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center space-x-2">
                      <Settings className="w-4 h-4 text-purple-600" />
                      <span>Implementation</span>
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• IMPLEMENTATION_GUIDE for project planning</li>
                      <li>• SUPPORT_POLICY for ongoing support discussions</li>
                      <li>• DEMO_SCRIPT for product demonstrations</li>
                      <li>• ORDER_FORM for contract finalization</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
