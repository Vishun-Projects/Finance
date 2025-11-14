/**
 * Haptic feedback utility
 * Supports Capacitor Haptics API for mobile and Vibration API fallback for web
 */

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

interface HapticsPlugin {
  impact?: (options: { style: 'LIGHT' | 'MEDIUM' | 'HEAVY' }) => Promise<void>;
  notification?: (options: { type: 'SUCCESS' | 'WARNING' | 'ERROR' }) => Promise<void>;
  vibrate?: (options: { duration: number }) => Promise<void>;
}

// Try to get Capacitor Haptics plugin
const getHapticsPlugin = (): HapticsPlugin | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    // Check if Capacitor is available
    if ('Capacitor' in window && (window as any).Capacitor?.Plugins?.Haptics) {
      return (window as any).Capacitor.Plugins.Haptics;
    }
  } catch {
    // Capacitor not available, will use fallback
  }
  
  return null;
};

// Check if Vibration API is available
const isVibrationSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'vibrate' in navigator;
};

// Vibration patterns for different haptic types
const VIBRATION_PATTERNS: Record<HapticType, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 30,
  success: [10, 50, 10],
  warning: [20, 50, 20],
  error: [30, 50, 30, 50, 30],
};

/**
 * Trigger haptic feedback
 * @param type - Type of haptic feedback
 */
export const triggerHaptic = async (type: HapticType = 'medium'): Promise<void> => {
  const haptics = getHapticsPlugin();
  
  // Use Capacitor Haptics if available
  if (haptics) {
    try {
      if (type === 'light' || type === 'medium' || type === 'heavy') {
        const styleMap = {
          light: 'LIGHT' as const,
          medium: 'MEDIUM' as const,
          heavy: 'HEAVY' as const,
        };
        if (haptics.impact) {
          await haptics.impact({ style: styleMap[type] });
          return;
        }
      } else if (type === 'success' || type === 'warning' || type === 'error') {
        const typeMap = {
          success: 'SUCCESS' as const,
          warning: 'WARNING' as const,
          error: 'ERROR' as const,
        };
        if (haptics.notification) {
          await haptics.notification({ type: typeMap[type] });
          return;
        }
      }
      
      // Fallback to vibrate if available
      if (haptics.vibrate) {
        const duration = type === 'light' ? 10 : type === 'medium' ? 20 : 30;
        await haptics.vibrate({ duration });
        return;
      }
    } catch (error) {
      // Silently fail and fall back to vibration API
      console.debug('Haptics plugin error:', error);
    }
  }
  
  // Fallback to Vibration API
  if (isVibrationSupported()) {
    const pattern = VIBRATION_PATTERNS[type];
    try {
      navigator.vibrate(pattern);
    } catch (error) {
      // Silently fail if vibration is not supported or blocked
      console.debug('Vibration API error:', error);
    }
  }
};

/**
 * Light haptic feedback (for button presses, taps)
 */
export const hapticLight = () => triggerHaptic('light');

/**
 * Medium haptic feedback (for confirmations, selections)
 */
export const hapticMedium = () => triggerHaptic('medium');

/**
 * Heavy haptic feedback (for important actions)
 */
export const hapticHeavy = () => triggerHaptic('heavy');

/**
 * Success haptic feedback
 */
export const hapticSuccess = () => triggerHaptic('success');

/**
 * Warning haptic feedback
 */
export const hapticWarning = () => triggerHaptic('warning');

/**
 * Error haptic feedback (for destructive actions)
 */
export const hapticError = () => triggerHaptic('error');

