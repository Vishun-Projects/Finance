// Neumorphism design system with black, white, and grey color scheme
import { cn } from './utils';

// Neumorphism color palette
export const neumorphismColors = {
  // Base colors
  background: {
    light: '#f0f0f0',
    dark: '#1a1a1a',
  },
  surface: {
    light: '#ffffff',
    dark: '#2a2a2a',
  },
  shadow: {
    light: '#d1d1d1',
    dark: '#000000',
  },
  highlight: {
    light: '#ffffff',
    dark: '#404040',
  },
  text: {
    primary: '#000000',
    secondary: '#666666',
    muted: '#999999',
    inverse: '#ffffff',
  },
} as const;

// Neumorphism shadow utilities
export const neumorphismShadows = {
  // Light theme shadows
  light: {
    inset: 'inset 8px 8px 16px #d1d1d1, inset -8px -8px 16px #ffffff',
    outset: '8px 8px 16px #d1d1d1, -8px -8px 16px #ffffff',
    pressed: 'inset 4px 4px 8px #d1d1d1, inset -4px -4px 8px #ffffff',
    floating: '12px 12px 24px #d1d1d1, -12px -12px 24px #ffffff',
  },
  // Dark theme shadows
  dark: {
    inset: 'inset 8px 8px 16px #000000, inset -8px -8px 16px #404040',
    outset: '8px 8px 16px #000000, -8px -8px 16px #404040',
    pressed: 'inset 4px 4px 8px #000000, inset -4px -4px 8px #404040',
    floating: '12px 12px 24px #000000, -12px -12px 24px #404040',
  },
} as const;

// Neumorphism component classes
export const neumorphismClasses = {
  // Card components
  card: (theme: 'light' | 'dark' = 'light') => cn(
    'rounded-2xl transition-all duration-300',
    theme === 'light' 
      ? 'bg-gray-100 shadow-[8px_8px_16px_#d1d1d1,-8px_-8px_16px_#ffffff]' 
      : 'bg-gray-800 shadow-[8px_8px_16px_#000000,-8px_-8px_16px_#404040]'
  ),
  
  cardInset: (theme: 'light' | 'dark' = 'light') => cn(
    'rounded-2xl transition-all duration-300',
    theme === 'light' 
      ? 'bg-gray-100 shadow-[inset_8px_8px_16px_#d1d1d1,inset_-8px_-8px_16px_#ffffff]' 
      : 'bg-gray-800 shadow-[inset_8px_8px_16px_#000000,inset_-8px_-8px_16px_#404040]'
  ),
  
  // Button components
  button: (theme: 'light' | 'dark' = 'light', variant: 'primary' | 'secondary' | 'ghost' = 'primary') => cn(
    'rounded-xl px-6 py-3 font-medium transition-all duration-200 active:scale-95',
    theme === 'light' 
      ? {
          primary: 'bg-gray-100 text-black shadow-[8px_8px_16px_#d1d1d1,-8px_-8px_16px_#ffffff] hover:shadow-[12px_12px_24px_#d1d1d1,-12px_-12px_24px_#ffffff] active:shadow-[inset_4px_4px_8px_#d1d1d1,inset_-4px_-4px_8px_#ffffff]',
          secondary: 'bg-gray-200 text-gray-800 shadow-[8px_8px_16px_#d1d1d1,-8px_-8px_16px_#ffffff] hover:shadow-[12px_12px_24px_#d1d1d1,-12px_-12px_24px_#ffffff] active:shadow-[inset_4px_4px_8px_#d1d1d1,inset_-4px_-4px_8px_#ffffff]',
          ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 hover:shadow-[8px_8px_16px_#d1d1d1,-8px_-8px_16px_#ffffff]',
        }[variant]
      : {
          primary: 'bg-gray-800 text-white shadow-[8px_8px_16px_#000000,-8px_-8px_16px_#404040] hover:shadow-[12px_12px_24px_#000000,-12px_-12px_24px_#404040] active:shadow-[inset_4px_4px_8px_#000000,inset_-4px_-4px_8px_#404040]',
          secondary: 'bg-gray-700 text-gray-200 shadow-[8px_8px_16px_#000000,-8px_-8px_16px_#404040] hover:shadow-[12px_12px_24px_#000000,-12px_-12px_24px_#404040] active:shadow-[inset_4px_4px_8px_#000000,inset_-4px_-4px_8px_#404040]',
          ghost: 'bg-transparent text-gray-300 hover:bg-gray-800 hover:shadow-[8px_8px_16px_#000000,-8px_-8px_16px_#404040]',
        }[variant]
  ),
  
  // Input components
  input: (theme: 'light' | 'dark' = 'light') => cn(
    'rounded-xl px-4 py-3 border-0 transition-all duration-200 focus:outline-none',
    theme === 'light' 
      ? 'bg-gray-100 text-black shadow-[inset_8px_8px_16px_#d1d1d1,inset_-8px_-8px_16px_#ffffff] focus:shadow-[inset_12px_12px_24px_#d1d1d1,inset_-12px_-12px_24px_#ffffff]' 
      : 'bg-gray-800 text-white shadow-[inset_8px_8px_16px_#000000,inset_-8px_-8px_16px_#404040] focus:shadow-[inset_12px_12px_24px_#000000,inset_-12px_-12px_24px_#404040]'
  ),
  
  // Metric cards
  metricCard: (theme: 'light' | 'dark' = 'light', type: 'income' | 'expense' | 'savings' | 'neutral' = 'neutral') => cn(
    'rounded-2xl p-6 transition-all duration-300 hover:scale-105',
    theme === 'light' 
      ? {
          income: 'bg-green-50 shadow-[8px_8px_16px_#d1d1d1,-8px_-8px_16px_#ffffff] border border-green-200',
          expense: 'bg-red-50 shadow-[8px_8px_16px_#d1d1d1,-8px_-8px_16px_#ffffff] border border-red-200',
          savings: 'bg-blue-50 shadow-[8px_8px_16px_#d1d1d1,-8px_-8px_16px_#ffffff] border border-blue-200',
          neutral: 'bg-gray-100 shadow-[8px_8px_16px_#d1d1d1,-8px_-8px_16px_#ffffff]',
        }[type]
      : {
          income: 'bg-green-900/20 shadow-[8px_8px_16px_#000000,-8px_-8px_16px_#404040] border border-green-800',
          expense: 'bg-red-900/20 shadow-[8px_8px_16px_#000000,-8px_-8px_16px_#404040] border border-red-800',
          savings: 'bg-blue-900/20 shadow-[8px_8px_16px_#000000,-8px_-8px_16px_#404040] border border-blue-800',
          neutral: 'bg-gray-800 shadow-[8px_8px_16px_#000000,-8px_-8px_16px_#404040]',
        }[type]
  ),
  
  // Navigation components
  navItem: (theme: 'light' | 'dark' = 'light', active: boolean = false) => cn(
    'rounded-xl px-4 py-3 transition-all duration-200',
    theme === 'light' 
      ? active 
        ? 'bg-gray-200 shadow-[inset_4px_4px_8px_#d1d1d1,inset_-4px_-4px_8px_#ffffff] text-black' 
        : 'bg-gray-100 shadow-[8px_8px_16px_#d1d1d1,-8px_-8px_16px_#ffffff] text-gray-700 hover:shadow-[12px_12px_24px_#d1d1d1,-12px_-12px_24px_#ffffff]'
      : active 
        ? 'bg-gray-700 shadow-[inset_4px_4px_8px_#000000,inset_-4px_-4px_8px_#404040] text-white' 
        : 'bg-gray-800 shadow-[8px_8px_16px_#000000,-8px_-8px_16px_#404040] text-gray-300 hover:shadow-[12px_12px_24px_#000000,-12px_-12px_24px_#404040]'
  ),
  
  // Chart containers
  chartContainer: (theme: 'light' | 'dark' = 'light') => cn(
    'rounded-2xl p-6 transition-all duration-300',
    theme === 'light' 
      ? 'bg-gray-100 shadow-[8px_8px_16px_#d1d1d1,-8px_-8px_16px_#ffffff]' 
      : 'bg-gray-800 shadow-[8px_8px_16px_#000000,-8px_-8px_16px_#404040]'
  ),
  
  // Status indicators
  statusIndicator: (status: 'success' | 'warning' | 'error' | 'info', theme: 'light' | 'dark' = 'light') => cn(
    'rounded-full w-3 h-3',
    theme === 'light' 
      ? {
          success: 'bg-green-500 shadow-[inset_2px_2px_4px_#22c55e,inset_-2px_-2px_4px_#4ade80]',
          warning: 'bg-yellow-500 shadow-[inset_2px_2px_4px_#eab308,inset_-2px_-2px_4px_#facc15]',
          error: 'bg-red-500 shadow-[inset_2px_2px_4px_#ef4444,inset_-2px_-2px_4px_#f87171]',
          info: 'bg-blue-500 shadow-[inset_2px_2px_4px_#3b82f6,inset_-2px_-2px_4px_#60a5fa]',
        }[status]
      : {
          success: 'bg-green-600 shadow-[inset_2px_2px_4px_#16a34a,inset_-2px_-2px_4px_#22c55e]',
          warning: 'bg-yellow-600 shadow-[inset_2px_2px_4px_#ca8a04,inset_-2px_-2px_4px_#eab308]',
          error: 'bg-red-600 shadow-[inset_2px_2px_4px_#dc2626,inset_-2px_-2px_4px_#ef4444]',
          info: 'bg-blue-600 shadow-[inset_2px_2px_4px_#2563eb,inset_-2px_-2px_4px_#3b82f6]',
        }[status]
  ),
} as const;

// Utility function to get theme-aware classes
export function getNeumorphismClasses(theme: 'light' | 'dark' = 'light') {
  return {
    card: (variant?: string) => neumorphismClasses.card(theme),
    cardInset: () => neumorphismClasses.cardInset(theme),
    button: (variant: 'primary' | 'secondary' | 'ghost' = 'primary') => neumorphismClasses.button(theme, variant),
    input: () => neumorphismClasses.input(theme),
    metricCard: (type: 'income' | 'expense' | 'savings' | 'neutral' = 'neutral') => neumorphismClasses.metricCard(theme, type),
    navItem: (active: boolean = false) => neumorphismClasses.navItem(theme, active),
    chartContainer: () => neumorphismClasses.chartContainer(theme),
    statusIndicator: (status: 'success' | 'warning' | 'error' | 'info') => neumorphismClasses.statusIndicator(status, theme),
  };
}

// Animation utilities for neumorphism
export const neumorphismAnimations = {
  hover: 'hover:scale-105 hover:shadow-[12px_12px_24px_#d1d1d1,-12px_-12px_24px_#ffffff]',
  press: 'active:scale-95 active:shadow-[inset_4px_4px_8px_#d1d1d1,inset_-4px_-4px_8px_#ffffff]',
  focus: 'focus:shadow-[inset_12px_12px_24px_#d1d1d1,inset_-12px_-12px_24px_#ffffff]',
  transition: 'transition-all duration-200 ease-in-out',
} as const;
