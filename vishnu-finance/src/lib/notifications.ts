'use client';

export interface NotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp?: number;
  actions?: NotificationAction[];
  data?: any;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

class NotificationService {
  private permission: NotificationPermission = 'default';
  private isSupported: boolean = false;

  constructor() {
    this.isSupported = 'Notification' in window;
    this.permission = this.isSupported ? Notification.permission : 'denied';
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('Notifications are not supported in this browser');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  async showNotification(options: NotificationOptions): Promise<Notification | null> {
    if (!this.isSupported) {
      console.warn('Notifications are not supported in this browser');
      return null;
    }

    if (this.permission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) {
        console.warn('Notification permission denied');
        return null;
      }
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        badge: options.badge || '/favicon.ico',
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
        timestamp: options.timestamp || Date.now(),
        data: options.data,
      });

      // Auto-close after 5 seconds unless requireInteraction is true
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }

  // Convenience methods for common notification types
  async showSuccess(title: string, body?: string): Promise<Notification | null> {
    return this.showNotification({
      title,
      body,
      tag: 'success',
      icon: '/icons/success.png',
    });
  }

  async showError(title: string, body?: string): Promise<Notification | null> {
    return this.showNotification({
      title,
      body,
      tag: 'error',
      icon: '/icons/error.png',
      requireInteraction: true,
    });
  }

  async showWarning(title: string, body?: string): Promise<Notification | null> {
    return this.showNotification({
      title,
      body,
      tag: 'warning',
      icon: '/icons/warning.png',
    });
  }

  async showInfo(title: string, body?: string): Promise<Notification | null> {
    return this.showNotification({
      title,
      body,
      tag: 'info',
      icon: '/icons/info.png',
    });
  }

  // Financial-specific notifications
  async showTransactionAlert(type: 'income' | 'expense', amount: number, description: string): Promise<Notification | null> {
    const title = type === 'income' ? '💰 New Income' : '💸 New Expense';
    const body = `${type === 'income' ? 'Received' : 'Spent'} ${amount.toLocaleString()} - ${description}`;
    
    return this.showNotification({
      title,
      body,
      tag: `transaction-${type}`,
      icon: type === 'income' ? '/icons/income.png' : '/icons/expense.png',
    });
  }

  async showGoalProgress(goalTitle: string, progress: number): Promise<Notification | null> {
    return this.showNotification({
      title: '🎯 Goal Progress Update',
      body: `${goalTitle}: ${progress}% complete`,
      tag: 'goal-progress',
      icon: '/icons/goal.png',
    });
  }

  async showDeadlineReminder(deadlineTitle: string, daysLeft: number): Promise<Notification | null> {
    const urgency = daysLeft <= 1 ? 'urgent' : 'normal';
    return this.showNotification({
      title: '⏰ Deadline Reminder',
      body: `${deadlineTitle} due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
      tag: 'deadline-reminder',
      icon: '/icons/deadline.png',
      requireInteraction: urgency === 'urgent',
    });
  }

  async showBudgetAlert(category: string, spent: number, budget: number): Promise<Notification | null> {
    const percentage = (spent / budget) * 100;
    return this.showNotification({
      title: '⚠️ Budget Alert',
      body: `${category} budget: ${percentage.toFixed(1)}% used (${spent}/${budget})`,
      tag: 'budget-alert',
      icon: '/icons/budget.png',
      requireInteraction: percentage >= 90,
    });
  }

  async showMarketUpdate(symbol: string, change: number, changePercent: number): Promise<Notification | null> {
    const isPositive = change >= 0;
    const emoji = isPositive ? '📈' : '📉';
    const sign = isPositive ? '+' : '';
    
    return this.showNotification({
      title: `${emoji} Market Update`,
      body: `${symbol}: ${sign}${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`,
      tag: 'market-update',
      icon: '/icons/market.png',
    });
  }

  // Check if notifications are supported and enabled
  isNotificationSupported(): boolean {
    return this.isSupported;
  }

  getPermissionStatus(): NotificationPermission {
    return this.permission;
  }

  // Schedule a notification for later (using setTimeout)
  scheduleNotification(options: NotificationOptions, delay: number): NodeJS.Timeout {
    return setTimeout(() => {
      this.showNotification(options);
    }, delay);
  }

  // Cancel a scheduled notification
  cancelScheduledNotification(timeoutId: NodeJS.Timeout): void {
    clearTimeout(timeoutId);
  }
}

// Create a singleton instance
export const notificationService = new NotificationService();

// Hook for using notifications in React components
export function useNotifications() {
  return {
    requestPermission: () => notificationService.requestPermission(),
    showNotification: (options: NotificationOptions) => notificationService.showNotification(options),
    showSuccess: (title: string, body?: string) => notificationService.showSuccess(title, body),
    showError: (title: string, body?: string) => notificationService.showError(title, body),
    showWarning: (title: string, body?: string) => notificationService.showWarning(title, body),
    showInfo: (title: string, body?: string) => notificationService.showInfo(title, body),
    showTransactionAlert: (type: 'income' | 'expense', amount: number, description: string) => 
      notificationService.showTransactionAlert(type, amount, description),
    showGoalProgress: (goalTitle: string, progress: number) => 
      notificationService.showGoalProgress(goalTitle, progress),
    showDeadlineReminder: (deadlineTitle: string, daysLeft: number) => 
      notificationService.showDeadlineReminder(deadlineTitle, daysLeft),
    showBudgetAlert: (category: string, spent: number, budget: number) => 
      notificationService.showBudgetAlert(category, spent, budget),
    showMarketUpdate: (symbol: string, change: number, changePercent: number) => 
      notificationService.showMarketUpdate(symbol, change, changePercent),
    isSupported: notificationService.isNotificationSupported(),
    permission: notificationService.getPermissionStatus(),
    scheduleNotification: (options: NotificationOptions, delay: number) => 
      notificationService.scheduleNotification(options, delay),
    cancelScheduledNotification: (timeoutId: NodeJS.Timeout) => 
      notificationService.cancelScheduledNotification(timeoutId),
  };
}
