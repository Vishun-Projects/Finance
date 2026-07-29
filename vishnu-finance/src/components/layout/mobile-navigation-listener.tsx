'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Keyboard } from '@capacitor/keyboard';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

import { SecurityOverlay } from './security-overlay';
import { useState } from 'react';

export function MobileNavigationListener() {
    const router = useRouter();
    const [isAppPaused, setIsAppPaused] = useState(false);

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        // 1. Initialize Native UI
        const initNativeUI = async () => {
            try {
                // Set Status Bar
                await StatusBar.setStyle({ style: Style.Dark });
                await StatusBar.setBackgroundColor({ color: '#000000' });

                // Hide splash as soon as the WebView has hydrated
                void SplashScreen.hide({ fadeOutDuration: 250 }).catch(() => {});

                // Safety fallback if hide above fails
                setTimeout(() => {
                    void SplashScreen.hide().catch(() => {});
                }, 1200);

                // Configure Keyboard
                if (Capacitor.getPlatform() === 'ios') {
                    await Keyboard.setAccessoryBarVisible({ isVisible: false });
                }
            } catch (err) {
                console.warn('Native UI initialization failed', err);
            }
        };

        initNativeUI();

        // 2. Lifecycle Listeners (Security & UX)
        const pauseListener = App.addListener('appStateChange', ({ isActive }) => {
            setIsAppPaused(!isActive);

            if (!isActive) {
                void Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
            }
        });

        // 3. Handle Hardware Back Button (Android)
        const backButtonListener = App.addListener('backButton', ({ canGoBack }) => {
          const openOverlay = document.querySelector('[data-state="open"][role="dialog"]');
          if (openOverlay) {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
            return;
          }

          if (canGoBack) {
            void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
            window.history.back();
          } else {
            void App.minimizeApp().catch(() => {});
          }
        });

        // 4. Handle Deep Links (OAuth Callbacks & App Links)
        const appUrlListener = App.addListener('appUrlOpen', async (data) => {

            try {
                const url = new URL(data.url);

                if (url.host === 'sms-review' || url.pathname.includes('sms-review')) {
                    void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
                    router.push('/settings?section=bank-sms&review=1');
                    return;
                }

                if (url.host === 'oauth-callback' || url.pathname === '/oauth-callback' || url.pathname.includes('oauth-callback')) {
                    const code = url.searchParams.get('code');
                    if (code) {
                        void Haptics.notification({ type: 'success' as any }).catch(() => {});

                        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://vishun-finance.vercel.app';
                        const exchangeRes = await fetch(`${apiUrl.replace(/\/$/, '')}/api/auth/mobile-session`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({ code }),
                        });

                        if (!exchangeRes.ok) {
                            toast.error('Failed to establish secure session');
                            return;
                        }

                        toast.success('Secure session established');

                        setTimeout(() => {
                            window.location.href = '/dashboard';
                        }, 500);
                        return;
                    }
                }
            } catch (err) {
                console.error('❌ [MobileNav] Deep link processing failed:', err);
            }
        });

        // 5. Bank SMS catch-up when app resumes (Android opt-in only)
        let smsSyncTimer: ReturnType<typeof setTimeout> | null = null;
        const maybeSyncBankSms = () => {
          void import('@/lib/sms-bank/sync').then(async (mod) => {
            await mod.startBankSmsClientListeners();
            await mod.syncBankSmsInbox({ notify: true });
          }).catch(() => {});
        };
        if (Capacitor.getPlatform() === 'android') {
          smsSyncTimer = setTimeout(maybeSyncBankSms, 1500);
        }

        const smsResumeListener = App.addListener('appStateChange', ({ isActive }) => {
          if (isActive && Capacitor.getPlatform() === 'android') {
            maybeSyncBankSms();
          }
        });

        // Clean up listeners
        return () => {
            pauseListener.then(h => h.remove());
            backButtonListener.then(h => h.remove());
            appUrlListener.then(h => h.remove());
            smsResumeListener.then(h => h.remove());
            if (smsSyncTimer) clearTimeout(smsSyncTimer);
        };
    }, [router]);

    return <SecurityOverlay isVisible={isAppPaused} />;
}
