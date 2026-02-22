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
            console.log('📱 App state changed. Active:', isActive);
            setIsAppPaused(!isActive);

            if (!isActive) {
                // Trigger haptic feedback when backgrounded
                Haptics.impact({ style: ImpactStyle.Medium });
            }
        });

        // 3. Handle Hardware Back Button (Android)
        const backButtonListener = App.addListener('backButton', ({ canGoBack }) => {
            if (canGoBack) {
                Haptics.impact({ style: ImpactStyle.Light });
                window.history.back();
            } else {
                App.minimizeApp();
            }
        });

        // 4. Handle Deep Links (OAuth Callbacks & App Links)
        const appUrlListener = App.addListener('appUrlOpen', async (data) => {
            console.log('📱 [MobileNav] App opened with URL:', data.url);

            try {
                const url = new URL(data.url);

                if (url.host === 'oauth-callback' || url.pathname === '/oauth-callback' || url.pathname.includes('oauth-callback')) {
                    const token = url.searchParams.get('token');
                    if (token) {
                        console.log('🔐 [MobileNav] OAuth token detected in URL');
                        Haptics.notification({ type: 'success' as any });

                        if (Capacitor.isNativePlatform()) {
                            const { CapacitorCookies } = await import('@capacitor/core');

                            console.log('🔐 [MobileNav] Syncing token to native vault...');
                            await CapacitorCookies.setCookie({
                                url: 'https://vishun-finance.vercel.app',
                                key: 'auth-token',
                                value: token,
                                expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString(),
                                path: '/',
                            });

                            // Verify cookie was set (Diagnostic)
                            const cookies = await CapacitorCookies.getCookies({ url: 'https://vishun-finance.vercel.app' });
                            console.log('🔐 [MobileNav] Native vault sync check:', cookies['auth-token'] ? 'SUCCESS' : 'FAILED');
                        } else {
                            document.cookie = `auth-token=${token}; path=/; max-age=604800; SameSite=None; Secure`;
                        }

                        toast.success('Secure session established');

                        // Safety delay to ensure bridge sync before navigation
                        console.log('📱 [MobileNav] Delaying dashboard entry for sync stability...');
                        setTimeout(() => {
                            console.log('🚀 [MobileNav] Navigating to dashboard');
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
