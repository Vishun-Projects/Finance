// Psychology-based UI design system for better user engagement and financial behavior
export interface ColorPsychology {
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  neutral: string;
}

export interface TypographyPsychology {
  heading: string;
  body: string;
  caption: string;
  emphasis: string;
}

export interface SpacingPsychology {
  micro: string;
  small: string;
  medium: string;
  large: string;
  xlarge: string;
}

export interface AnimationPsychology {
  duration: {
    fast: string;
    normal: string;
    slow: string;
  };
  easing: {
    ease: string;
    easeIn: string;
    easeOut: string;
    easeInOut: string;
  };
}

// Psychology-based color system
export const psychologyColors: ColorPsychology = {
  // Trust and stability (blues)
  primary: '#1e40af', // Deep blue for trust
  secondary: '#3b82f6', // Medium blue for reliability
  
  // Energy and action (greens)
  accent: '#059669', // Green for growth and money
  success: '#10b981', // Bright green for positive actions
  
  // Attention and caution (oranges/yellows)
  warning: '#f59e0b', // Amber for attention
  error: '#dc2626', // Red for urgent actions
  
  // Neutral and calm (grays)
  neutral: '#6b7280' // Gray for secondary information
};

// Psychology-based typography
export const psychologyTypography: TypographyPsychology = {
  heading: 'font-bold text-gray-900 leading-tight', // Strong, confident headings
  body: 'text-gray-700 leading-relaxed', // Easy to read body text
  caption: 'text-sm text-gray-500', // Subtle captions
  emphasis: 'font-semibold text-gray-900' // Emphasized text
};

// Psychology-based spacing
export const psychologySpacing: SpacingPsychology = {
  micro: '0.25rem', // 4px - for tight elements
  small: '0.5rem', // 8px - for related elements
  medium: '1rem', // 16px - for standard spacing
  large: '1.5rem', // 24px - for section spacing
  xlarge: '2rem' // 32px - for major sections
};

// Psychology-based animations
export const psychologyAnimations: AnimationPsychology = {
  duration: {
    fast: '150ms', // Quick feedback
    normal: '300ms', // Standard transitions
    slow: '500ms' // Deliberate actions
  },
  easing: {
    ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)'
  }
};

// Financial behavior psychology classes
export class FinancialPsychologyUI {
  // Create trust-building elements
  static getTrustElements() {
    return {
      securityBadge: 'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200',
      encryptionIcon: 'w-4 h-4 text-green-600',
      complianceBadge: 'inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800',
      bankGradeSecurity: 'text-sm text-gray-600 flex items-center space-x-1'
    };
  }

  // Create urgency and action elements
  static getActionElements() {
    return {
      urgentButton: 'bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl',
      primaryButton: 'bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg',
      secondaryButton: 'bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors duration-200 border border-gray-300',
      successButton: 'bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg'
    };
  }

  // Create progress and achievement elements
  static getProgressElements() {
    return {
      progressBar: 'w-full bg-gray-200 rounded-full h-3 overflow-hidden',
      progressFill: 'h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500 ease-out',
      achievementBadge: 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 border border-yellow-200',
      milestoneIcon: 'w-5 h-5 text-yellow-600',
      celebrationAnimation: 'animate-bounce'
    };
  }

  // Create financial health indicators
  static getHealthIndicators() {
    return {
      excellent: 'bg-green-100 text-green-800 border-green-200',
      good: 'bg-blue-100 text-blue-800 border-blue-200',
      fair: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      poor: 'bg-orange-100 text-orange-800 border-orange-200',
      critical: 'bg-red-100 text-red-800 border-red-200'
    };
  }

  // Create emotional feedback elements
  static getEmotionalFeedback() {
    return {
      positive: 'text-green-600 bg-green-50 border border-green-200 rounded-lg p-4',
      negative: 'text-red-600 bg-red-50 border border-red-200 rounded-lg p-4',
      neutral: 'text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-4',
      encouraging: 'text-blue-600 bg-blue-50 border border-blue-200 rounded-lg p-4'
    };
  }

  // Create cognitive load reduction elements
  static getCognitiveLoadReduction() {
    return {
      simpleCard: 'bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow duration-200',
      minimalInput: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
      clearHierarchy: 'space-y-4',
      groupedElements: 'space-y-2',
      visualSeparator: 'border-t border-gray-200 my-4'
    };
  }

  // Create motivation and engagement elements
  static getMotivationElements() {
    return {
      streakCounter: 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800',
      goalProgress: 'text-lg font-bold text-green-600',
      savingsMilestone: 'text-2xl font-bold text-blue-600',
      achievementUnlock: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg font-semibold',
      encouragementMessage: 'text-center text-gray-600 italic'
    };
  }

  // Create accessibility and inclusion elements
  static getAccessibilityElements() {
    return {
      highContrast: 'text-black bg-white border-2 border-black',
      largeText: 'text-lg',
      clearFocus: 'focus:outline-none focus:ring-4 focus:ring-blue-300',
      screenReaderOnly: 'sr-only',
      skipLink: 'absolute -top-40 left-6 bg-blue-600 text-white px-4 py-2 rounded focus:top-6 transition-all duration-200'
    };
  }
}

// Financial behavior triggers
export class FinancialBehaviorTriggers {
  // Loss aversion (highlighting potential losses)
  static createLossAversionAlert(amount: number, timeframe: string) {
    return {
      message: `You could lose ₹${amount.toLocaleString()} in ${timeframe} if you don't act now`,
      style: 'bg-red-50 border border-red-200 text-red-800 rounded-lg p-4',
      urgency: 'high'
    };
  }

  // Social proof (showing what others are doing)
  static createSocialProof(percentage: number, action: string) {
    return {
      message: `${percentage}% of users like you are ${action}`,
      style: 'bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-4',
      credibility: 'high'
    };
  }

  // Anchoring (showing reference points)
  static createAnchoringEffect(current: number, reference: number, context: string) {
    const difference = current - reference;
    const percentage = ((difference / reference) * 100).toFixed(1);
    
    return {
      message: `Your ${context} is ${percentage}% ${difference > 0 ? 'higher' : 'lower'} than the average`,
      style: difference > 0 ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-yellow-50 border border-yellow-200 text-yellow-800',
      rounded: 'rounded-lg p-4'
    };
  }

  // Scarcity (creating urgency)
  static createScarcityAlert(limit: number, current: number, timeframe: string) {
    const remaining = limit - current;
    const percentage = ((remaining / limit) * 100).toFixed(1);
    
    return {
      message: `Only ${percentage}% of your ${timeframe} budget remaining`,
      style: percentage < 20 ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-yellow-50 border border-yellow-200 text-yellow-800',
      rounded: 'rounded-lg p-4',
      urgency: percentage < 20 ? 'high' : 'medium'
    };
  }

  // Goal gradient (showing progress toward goals)
  static createGoalGradient(current: number, target: number, goalName: string) {
    const progress = (current / target) * 100;
    const remaining = target - current;
    
    return {
      progress: Math.min(progress, 100),
      message: progress >= 100 
        ? `🎉 Congratulations! You've achieved your ${goalName} goal!`
        : `You're ${progress.toFixed(1)}% toward your ${goalName} goal. ₹${remaining.toLocaleString()} to go!`,
      style: progress >= 100 
        ? 'bg-green-50 border border-green-200 text-green-800'
        : 'bg-blue-50 border border-blue-200 text-blue-800',
      rounded: 'rounded-lg p-4'
    };
  }
}

// Micro-interactions for better engagement
export class MicroInteractions {
  // Hover effects
  static getHoverEffects() {
    return {
      lift: 'hover:transform hover:-translate-y-1 hover:shadow-lg transition-all duration-200',
      glow: 'hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200',
      scale: 'hover:transform hover:scale-105 transition-all duration-200',
      colorShift: 'hover:bg-blue-50 hover:border-blue-200 transition-all duration-200'
    };
  }

  // Loading states
  static getLoadingStates() {
    return {
      skeleton: 'animate-pulse bg-gray-200 rounded',
      spinner: 'animate-spin rounded-full border-2 border-gray-300 border-t-blue-600',
      progress: 'animate-pulse bg-gradient-to-r from-blue-400 to-blue-600 rounded-full h-2',
      shimmer: 'animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]'
    };
  }

  // Success feedback
  static getSuccessFeedback() {
    return {
      checkmark: 'animate-bounce text-green-600',
      confetti: 'animate-pulse text-yellow-500',
      celebration: 'animate-bounce text-blue-600',
      progress: 'animate-pulse text-green-600'
    };
  }

  // Error feedback
  static getErrorFeedback() {
    return {
      shake: 'animate-pulse text-red-600',
      warning: 'animate-bounce text-yellow-600',
      alert: 'animate-pulse text-red-600',
      attention: 'animate-bounce text-orange-600'
    };
  }
}

// Accessibility and inclusion features
export class AccessibilityFeatures {
  // Color contrast ratios
  static getContrastRatios() {
    return {
      normal: '4.5:1',
      large: '3:1',
      enhanced: '7:1'
    };
  }

  // Screen reader support
  static getScreenReaderSupport() {
    return {
      ariaLabel: (label: string) => `aria-label="${label}"`,
      ariaDescribedBy: (id: string) => `aria-describedby="${id}"`,
      ariaExpanded: (expanded: boolean) => `aria-expanded="${expanded}"`,
      ariaHidden: 'aria-hidden="true"',
      role: (role: string) => `role="${role}"`
    };
  }

  // Keyboard navigation
  static getKeyboardNavigation() {
    return {
      tabIndex: (index: number) => `tabindex="${index}"`,
      onKeyDown: (handler: string) => `onKeyDown="${handler}"`,
      focusVisible: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
      skipLink: 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
    };
  }
}

// Export all psychology-based UI utilities
export const PsychologyUI = {
  colors: psychologyColors,
  typography: psychologyTypography,
  spacing: psychologySpacing,
  animations: psychologyAnimations,
  financial: FinancialPsychologyUI,
  behavior: FinancialBehaviorTriggers,
  micro: MicroInteractions,
  accessibility: AccessibilityFeatures
};
