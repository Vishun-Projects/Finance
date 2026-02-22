'use client';

import { NativeBiometric, BiometryType } from '@capgo/capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export const BiometricService = {
    /**
     * Check if biometric authentication is available on the device
     */
    async isAvailable(): Promise<boolean> {
        if (!Capacitor.isNativePlatform()) return false;

        try {
            const result = await NativeBiometric.isAvailable();
            return !!result.isAvailable;
        } catch (err) {
            console.error('Biometric availability check failed', err);
            return false;
        }
    },

    /**
     * Get the type of biometric authentication available
     */
    async getBiometryType(): Promise<BiometryType | 'none'> {
        if (!Capacitor.isNativePlatform()) return 'none';

        try {
            const result = await NativeBiometric.isAvailable();
            return result.biometryType || 'none';
        } catch (err) {
            return 'none';
        }
    },

    /**
     * Perform biometric authentication
     */
    async authenticate(reason: string = 'Authenticate to access your secure vault'): Promise<boolean> {
        if (!Capacitor.isNativePlatform()) return false;

        try {
            // Check availability first
            const availableStatus = await NativeBiometric.isAvailable();
            if (!availableStatus.isAvailable) return false;

            // Perform authentication
            await NativeBiometric.verifyIdentity({
                reason,
                title: 'Security Verification',
                subtitle: 'Verify your identity to proceed',
                description: 'Use your biometric credentials to securely sign in.',
                negativeButtonText: 'Cancel',
            });

            // Authentication successful
            await Haptics.impact({ style: ImpactStyle.Medium });
            return true;
        } catch (err: any) {
            console.error('Biometric authentication failed', err);
            await Haptics.notification({ type: 'error' as any });
            return false;
        }
    },

    /**
     * Save credentials securely (e.g., for auto-login)
     */
    async setCredentials(username: string, password: string): Promise<boolean> {
        if (!Capacitor.isNativePlatform()) return false;

        try {
            await NativeBiometric.setCredentials({
                username,
                password,
                server: 'vishnu.finance',
            });
            return true;
        } catch (err) {
            console.error('Failed to save credentials', err);
            return false;
        }
    },

    /**
     * Retrieve saved credentials
     */
    async getCredentials(): Promise<{ username: string; password: string } | null> {
        if (!Capacitor.isNativePlatform()) return null;

        try {
            const credentials = await NativeBiometric.getCredentials({
                server: 'vishnu.finance',
            });
            return credentials;
        } catch (err) {
            return null;
        }
    },

    /**
     * Delete saved credentials
     */
    async deleteCredentials(): Promise<boolean> {
        if (!Capacitor.isNativePlatform()) return false;

        try {
            await NativeBiometric.deleteCredentials({
                server: 'vishnu.finance',
            });
            return true;
        } catch (err) {
            return false;
        }
    }
};
