'use client';

import { useState, useEffect } from 'react';
import { usePendingAction } from '@/hooks/use-pending-action';
import { ArrowLeft } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useToast } from '@/contexts/ToastContext';
import { useNotifications } from '@/lib/notifications';
import { useIsMobile } from '@/hooks/use-breakpoint';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import ProfileSettingsSection from '@/features/settings/components/profile-section';
import { AppearanceSettings } from '@/features/settings/components/appearance-settings';
import { NotificationsSettings } from '@/features/settings/components/notifications-settings';
import { SecuritySettings } from '@/features/settings/components/security-settings';
import { CategoriesSettings } from '@/features/settings/components/categories-settings';
import { PortalSettings } from '@/features/settings/components/portal-settings';
import { NetWorthSection } from '@/features/settings/components/net-worth-section';
import { SettingsLegalPanel } from '@/features/settings/components/settings-legal-panel';
import { SettingsDesktopLayout } from '@/features/settings/components/settings-desktop-layout';
import {
  SettingsMobileNav,
  getSettingsTabLabel,
} from '@/features/settings/components/settings-mobile-nav';
import type { SettingsSectionId, LegalDocHref } from '@/features/settings/components/settings-nav-config';
import { getLegalDocLabel } from '@/features/settings/components/settings-nav-config';
import type { UserDocumentSummary } from '@/types/documents';
import type { UserPreferencesPayload } from '@/features/settings/types';
import type { UserProfilePayload } from '@/features/settings/loaders-profile';

interface SettingsPageClientProps {
  initialDocuments?: UserDocumentSummary[];
  initialPreferences?: UserPreferencesPayload | null;
  initialProfile?: UserProfilePayload | null;
}

export default function SettingsPageClient({
  initialDocuments,
  initialPreferences,
  initialProfile,
}: SettingsPageClientProps) {
  const [activeTab, setActiveTab] = useState<SettingsSectionId>('profile');
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocHref | null>(null);
  const [mobileInSection, setMobileInSection] = useState(false);
  const isMobile = useIsMobile('lg');
  const { run: runSave, isPending: loading } = usePendingAction();
  const [savedSections, setSavedSections] = useState<Record<string, boolean>>({});
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { selectedCurrency, setSelectedCurrency, lastUpdated } = useCurrency();
  const { success, error: showError } = useToast();
  const { requestPermission, isSupported, permission } = useNotifications();
  const { setPageHeader, clearPageHeader } = usePageHeader();

  const [preferences, setPreferences] = useState({
    language: initialPreferences?.language ?? 'en',
    currency: initialPreferences?.currency ?? selectedCurrency,
    dateFormat: initialPreferences?.dateFormat ?? 'DD/MM/YYYY',
    timezone: initialPreferences?.timezone ?? 'Asia/Kolkata',
    telegramUserId: initialPreferences?.telegramUserId ?? '',
    telegramEnabled: initialPreferences?.telegramEnabled ?? false,
    emailEnabled: initialPreferences?.emailEnabled ?? false,
    notificationEmail: initialPreferences?.notificationEmail ?? '',
    dailyQuoteEnabled: initialPreferences?.dailyQuoteEnabled ?? false,
  });

  const [pushEnabled, setPushEnabled] = useState(false);

  const [privacy, setPrivacy] = useState({
    profileVisibility: 'private',
    dataSharing: false,
    analytics: true,
  });

  useEffect(() => {
    if (initialPreferences?.currency && initialPreferences.currency !== selectedCurrency) {
      setSelectedCurrency(initialPreferences.currency);
    }
  }, [initialPreferences?.currency, selectedCurrency, setSelectedCurrency]);

  useEffect(() => {
    setPreferences((prev) => ({
      ...prev,
      currency: selectedCurrency,
    }));
  }, [selectedCurrency]);

  useEffect(() => {
    setPushEnabled(permission === 'granted');
  }, [permission]);

  const handleSave = async (section: string) => {
    if (!user?.id) {
      showError('Error', 'No user ID available');
      return;
    }

    await runSave(async () => {
      try {
        const response = await fetch('/api/user-preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            navigationLayout: 'top',
            currency: selectedCurrency,
            language: preferences.language,
            timezone: preferences.timezone,
            dateFormat: preferences.dateFormat,
            telegramUserId: preferences.telegramUserId,
            telegramEnabled: preferences.telegramEnabled,
            emailEnabled: preferences.emailEnabled,
            notificationEmail: preferences.notificationEmail,
            dailyQuoteEnabled: preferences.dailyQuoteEnabled,
          }),
        });

        const responseData = await response.json();

        if (response.ok) {
          success('Settings saved', `${section} settings have been saved successfully.`);
          setSavedSections((prev) => ({ ...prev, [section]: true }));
          setTimeout(() => {
            setSavedSections((prev) => ({ ...prev, [section]: false }));
          }, 3000);
        } else {
          showError('Save failed', responseData.error || 'Unknown error');
          throw new Error(responseData.error || 'Save failed');
        }
      } catch (error) {
        if (error instanceof Error && error.message !== 'Save failed') {
          showError('Network error', 'Could not save preferences. Please try again.');
        }
        throw error;
      }
    });
  };

  const handlePushToggle = async (checked: boolean) => {
    if (checked && permission !== 'granted') {
      if (!isSupported) {
        showError('Not supported', 'Push notifications are not supported in this browser');
        return;
      }
      try {
        const granted = await requestPermission();
        if (granted) {
          success('Permission granted', 'Push notifications are now enabled');
          setPushEnabled(true);
        } else {
          showError(
            'Permission denied',
            'Notifications were blocked. Enable them in your browser settings.'
          );
        }
      } catch {
        showError('Error', 'Failed to request notification permission');
      }
      return;
    }
    setPushEnabled(checked);
  };

  const handleTestAlert = async () => {
    try {
      const res = await fetch('/api/n8n/test-notification', { method: 'POST' });
      if (res.ok) {
        success('Test sent', 'Check your configured alert channels.');
      } else {
        showError('Test failed', 'Could not send test notification.');
      }
    } catch {
      showError('Test failed', 'Could not send test notification.');
    }
  };

  const handleSectionChange = (tab: SettingsSectionId) => {
    setActiveLegalDoc(null);
    setActiveTab(tab);
  };

  const handleMobileTabSelect = (tab: string) => {
    setActiveLegalDoc(null);
    setActiveTab(tab as SettingsSectionId);
    setMobileInSection(true);
  };

  const handleLegalDocChange = (href: LegalDocHref) => {
    setActiveLegalDoc(href);
    setMobileInSection(true);
  };

  const handleMobileBack = () => {
    setMobileInSection(false);
    setActiveLegalDoc(null);
  };

  useEffect(() => {
    if (!isMobile) {
      clearPageHeader();
      return;
    }

    if (!mobileInSection) {
      clearPageHeader();
      return;
    }

    const sectionTitle = activeLegalDoc
      ? getLegalDocLabel(activeLegalDoc)
      : getSettingsTabLabel(activeTab);

    setPageHeader({
      title: sectionTitle,
      backAction: (
        <button
          type="button"
          className="btn-touch flex size-9 shrink-0 items-center justify-center rounded-md border border-border text-foreground"
          onClick={handleMobileBack}
          aria-label="Back to Settings"
        >
          <ArrowLeft className="size-4" />
        </button>
      ),
    });

    return () => clearPageHeader();
  }, [
    isMobile,
    mobileInSection,
    activeLegalDoc,
    activeTab,
    setPageHeader,
    clearPageHeader,
  ]);

  const renderSection = () => {
    if (activeLegalDoc) {
      return <SettingsLegalPanel docId={activeLegalDoc} />;
    }

    switch (activeTab) {
      case 'profile':
        return <ProfileSettingsSection includePayments initialProfile={initialProfile} />;
      case 'appearance':
        return (
          <AppearanceSettings
            theme={theme ?? 'system'}
            onThemeChange={setTheme}
            preferences={{
              language: preferences.language,
              dateFormat: preferences.dateFormat,
              timezone: preferences.timezone,
            }}
            onPreferencesChange={(next) => setPreferences((prev) => ({ ...prev, ...next }))}
            selectedCurrency={selectedCurrency}
            onCurrencyChange={setSelectedCurrency}
            lastUpdated={lastUpdated}
            loading={loading}
            saved={Boolean(savedSections.Appearance)}
            onSave={() => handleSave('Appearance')}
          />
        );
      case 'notifications':
        return (
          <NotificationsSettings
            preferences={{
              emailEnabled: preferences.emailEnabled,
              telegramEnabled: preferences.telegramEnabled,
              dailyQuoteEnabled: preferences.dailyQuoteEnabled,
              notificationEmail: preferences.notificationEmail,
              telegramUserId: preferences.telegramUserId,
            }}
            onPreferencesChange={(next) => setPreferences((prev) => ({ ...prev, ...next }))}
            pushEnabled={pushEnabled}
            pushSupported={isSupported}
            onPushToggle={handlePushToggle}
            loading={loading}
            saved={Boolean(savedSections.Notifications)}
            onSave={() => handleSave('Notifications')}
            onTestAlert={handleTestAlert}
          />
        );
      case 'security':
        return (
          <SecuritySettings
            privacy={{ dataSharing: privacy.dataSharing, analytics: privacy.analytics }}
            onPrivacyChange={(next) => setPrivacy((prev) => ({ ...prev, ...next }))}
          />
        );
      case 'categories':
        return <CategoriesSettings />;
      case 'networth':
        return <NetWorthSection />;
      case 'documentation':
        return <PortalSettings initialDocuments={initialDocuments} />;
      default:
        return null;
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <p className="text-muted-foreground">Please log in to access settings</p>
      </div>
    );
  }

  const showMobileMenu = isMobile && !mobileInSection;
  const showSettingsPanels = !isMobile || mobileInSection;

  return (
    <>
      {showMobileMenu && (
        <div className="space-y-5 lg:space-y-6 lg:hidden">
          <p className="text-sm text-muted-foreground">Account, preferences, and support</p>
          <SettingsMobileNav
            onTabChange={handleMobileTabSelect}
            onLegalDocChange={handleLegalDocChange}
          />
        </div>
      )}

      {showSettingsPanels && <div className="lg:hidden">{renderSection()}</div>}

      <SettingsDesktopLayout
        activeSection={activeTab}
        activeLegalDoc={activeLegalDoc}
        onSectionChange={handleSectionChange}
        onLegalDocChange={handleLegalDocChange}
      >
        {renderSection()}
      </SettingsDesktopLayout>
    </>
  );
}
