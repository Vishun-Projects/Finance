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

                // Hide Splash Screen after hydration
                setTimeout(() => {
                    SplashScreen.hide({ fadeOutDuration: 400 });
                }, 800);

                // Fallback for safety
                setTimeout(() => {
                    SplashScreen.hide();
                }, 3000);

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
                // Trigger haptic feedback when backgrounded
                Haptics.impact({ style: ImpactStyle.Medium });
            }
        });

        // 3. Handle Hardware Back Button (Android)
        const backButtonListener = App.addListener('backButton', ({ canGoBack }) => {
          const openOverlay = document.querySelector('[data-state="open"][role="dialog"]');
          if (openOverlay) {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            void Haptics.impact({ style: ImpactStyle.Light });
            return;
          }

          if (canGoBack) {
            void Haptics.impact({ style: ImpactStyle.Light });
            window.history.back();
          } else {
            App.minimizeApp();
          }
        });

        // 4. Handle Deep Links (OAuth Callbacks & App Links)
        const appUrlListener = App.addListener('appUrlOpen', async (data) => {

            try {
                const url = new URL(data.url);

                if (url.host === 'oauth-callback' || url.pathname === '/oauth-callback' || url.pathname.includes('oauth-callback')) {
                    const code = url.searchParams.get('code');
                    if (code) {
                        Haptics.notification({ type: 'success' as any });

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

        // Clean up listeners
        return () => {
            pauseListener.then(h => h.remove());
            backButtonListener.then(h => h.remove());
            appUrlListener.then(h => h.remove());
        };
    }, [router]);

    return <SecurityOverlay isVisible={isAppPaused} />;
}
