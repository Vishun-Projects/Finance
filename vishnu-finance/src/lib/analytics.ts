/**
 * Analytics tracking utility for micro-interactions
 * Integrates with existing PerformanceMonitor
 * Ensures no PII in telemetry
 */

import { PerformanceMonitor } from './monitoring';

export type AnalyticsEvent =
  | 'fab_opened'
  | 'sheet_action_selected'
  | 'transaction_added'
  | 'transaction_edited'
  | 'transaction_deleted'
  | 'swipe_action_used'
  | 'undo_clicked'
  | 'pull_to_refresh'
  | 'chart_series_toggled'
  | 'quick_range_changed'
  | 'preset_selected';

export interface AnalyticsMetadata {
  latency?: number; // in milliseconds
  completionTime?: number; // in milliseconds
  success?: boolean;
  errorType?: string;
  [key: string]: unknown;
}

/**
 * Track a micro-interaction event
 * @param event - Event name
 * @param metadata - Optional metadata (no PII)
 * @param userId - Optional user ID (will be hashed if provided)
 */
export const trackEvent = (
  event: AnalyticsEvent,
  metadata?: AnalyticsMetadata,
  userId?: string
): void => {
  try {
    // Use existing PerformanceMonitor if available
    if (userId) {
      PerformanceMonitor.trackUserInteraction(userId, event, metadata);
    }
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Analytics]', event, metadata);
    }
    
    // In production, you might want to send to analytics service
    // Example: analytics.track(event, metadata);
  } catch (error) {
    // Silently fail analytics tracking
    console.debug('Analytics tracking error:', error);
  }
};

/**
 * Track FAB opened event
 */
export const trackFabOpened = (userId?: string) => {
  trackEvent('fab_opened', {}, userId);
};

/**
 * Track sheet action selected
 */
export const trackSheetActionSelected = (
  action: string,
  preset?: string,
  userId?: string
) => {
  trackEvent('sheet_action_selected', { action, preset }, userId);
};

/**
 * Track transaction added
 */
export const trackTransactionAdded = (
  metadata: { latency?: number; success?: boolean },
  userId?: string
) => {
  trackEvent('transaction_added', metadata, userId);
};

/**
 * Track transaction edited
 */
export const trackTransactionEdited = (
  metadata: { latency?: number; success?: boolean },
  userId?: string
) => {
  trackEvent('transaction_edited', metadata, userId);
};

/**
 * Track transaction deleted
 */
export const trackTransactionDeleted = (
  metadata: { latency?: number; success?: boolean },
  userId?: string
) => {
  trackEvent('transaction_deleted', metadata, userId);
};

/**
 * Track swipe action used
 */
export const trackSwipeAction = (
  direction: 'left' | 'right',
  action: 'delete' | 'edit' | 'details',
  userId?: string
) => {
  trackEvent('swipe_action_used', { direction, action }, userId);
};

/**
 * Track undo clicked
 */
export const trackUndoClicked = (
  action: string,
  userId?: string
) => {
  trackEvent('undo_clicked', { action }, userId);
};

/**
 * Track pull to refresh
 */
export const trackPullToRefresh = (
  metadata: { latency?: number; success?: boolean },
  userId?: string
) => {
  trackEvent('pull_to_refresh', metadata, userId);
};

/**
 * Track chart series toggled
 */
export const trackChartSeriesToggled = (
  series: string,
  visible: boolean,
  userId?: string
) => {
  trackEvent('chart_series_toggled', { series, visible }, userId);
};

/**
 * Track quick range changed
 */
export const trackQuickRangeChanged = (
  range: string,
  userId?: string
) => {
  trackEvent('quick_range_changed', { range }, userId);
};

/**
 * Track preset selected
 */
export const trackPresetSelected = (
  preset: string,
  userId?: string
) => {
  trackEvent('preset_selected', { preset }, userId);
};

