'use client';

import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Calendar,
  PiggyBank,
  Activity,
  RefreshCw,
  Filter,
  Plus,
  User,
  Clock,
  Wifi,
  WifiOff,
  Edit,
  Trash2,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { formatRupees } from '../lib/utils';
import Link from 'next/link';
import UserValidation from './user-validation';
import PageSkeleton from './page-skeleton';
import { hapticLight, hapticMedium, hapticError, hapticSuccess } from '@/lib/haptics';
import { trackPullToRefresh, trackChartSeriesToggled, trackTransactionAdded, trackTransactionEdited } from '@/lib/analytics';
import { prefersReducedMotion, getFadeAnimation, TIMING } from '@/lib/motion-utils';
import { useToast } from '../contexts/ToastContext';
import TransactionFormModal, { TransactionFormData } from './transaction-form-modal';
import TransactionAddSheet, { TransactionPreset } from './ui/transaction-add-sheet';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar } from './ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { DateRangePicker } from './ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import QuickRangeChips, { QuickRange } from './ui/quick-range-chips';
import FilterSheet from './ui/filter-sheet';
import FabButton from './ui/fab-button';
import { Calendar as CalendarComponent } from './ui/calendar';

export interface SimpleDashboardData {
  totalIncome: number;
  totalExpenses: number;
  totalCredits?: number;
  totalDebits?: number;
  netSavings: number;
  savingsRate: number;
  upcomingDeadlines: number;
  activeGoals: number;
  recentTransactions: Array<{
    id: string;
    title: string;
    amount: number;
    type: 'income' | 'expense' | 'credit' | 'debit';
    category: string;
    date: string;
    financialCategory?: string;
    store?: string | null;
  }>;
  financialHealthScore: number;
  monthlyTrends: Array<{
    month: string;
    income: number;
    expenses: number;
    savings: number;
    credits?: number;
    debits?: number;
  }>;
  categoryBreakdown: Array<{
    name: string;
    amount: number;
  }>;
  categoryStats?: Record<string, { credits: number; debits: number }>;
}

// Offline cache helpers
const CACHE_KEY = 'dashboard_cache';
const CACHE_TIMESTAMP_KEY = 'dashboard_cache_timestamp';

async function getCachedDashboard(): Promise<SimpleDashboardData | null> {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    if (cached && timestamp) {
      const age = Date.now() - parseInt(timestamp, 10);
      // Use cache if less than 1 hour old
      if (age < 60 * 60 * 1000) {
        return JSON.parse(cached);
      }
    }
  } catch (error) {
    console.error('Error reading cache:', error);
  }
  return null;
}

async function setCachedDashboard(data: SimpleDashboardData): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.error('Error writing cache:', error);
  }
}

// Compact Metric Card Component - Minimal Design
const CompactMetricCard = memo(({
  label,
  value,
  icon: Icon,
  iconColor,
  valueColor,
  isUpdating,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  iconColor: string;
  valueColor?: string;
  isUpdating?: boolean;
}) => (
  <Card className={`flex-1 ${isUpdating ? 'opacity-75 transition-opacity duration-200' : ''}`}>
    <CardContent className="p-3 md:p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Icon className={`h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0 ${iconColor}`} aria-hidden="true" />
          <span className="text-xs md:text-sm font-medium text-muted-foreground truncate">{label}</span>
        </div>
      </div>
      <div className={`text-lg md:text-xl lg:text-2xl font-bold mt-1.5 md:mt-2 transition-all truncate ${valueColor || 'text-foreground'}`}>
        {value}
      </div>
    </CardContent>
  </Card>
));

CompactMetricCard.displayName = 'CompactMetricCard';

// Simplified Transaction Row Component - No Swipe
const TransactionRow = memo(({
  transaction,
  onTap,
  onEdit,
  onDelete,
  isPending = false,
}: {
  transaction: SimpleDashboardData['recentTransactions'][0];
  onTap?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isPending?: boolean;
}) => {
  const isCredit = transaction.type === 'credit' || transaction.type === 'income' || transaction.amount > 0;
  const isDebit = transaction.type === 'debit' || transaction.type === 'expense' || transaction.amount < 0;
  const storeName = transaction.store || 'no name';
  
  const handleTap = () => {
    if (onTap) {
      hapticLight();
      onTap();
    }
  };
  
  return (
    <div
      className={`
        flex items-center gap-3 p-3 rounded-lg border bg-card
        transition-colors hover:bg-muted/50 cursor-pointer
        ${isPending ? 'opacity-50' : ''}
      `}
      onClick={handleTap}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleTap();
        }
      }}
      aria-label={`Transaction: ${storeName}, ${formatRupees(Math.abs(transaction.amount))}, tap to view details`}
    >
      {/* Pending Indicator */}
      {isPending && (
        <div className="absolute left-2 top-2">
          <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
        </div>
      )}
      
      {/* Status Dot */}
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isCredit ? 'bg-emerald-500' : 'bg-red-500'}`} 
        aria-label={isCredit ? 'Credit transaction' : 'Debit transaction'} />
      
      {/* Store Name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{storeName}</p>
      </div>
      
      {/* Amount and Date */}
      <div className="text-right flex-shrink-0">
        <p className={`text-sm font-semibold ${isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
          {isCredit ? '+' : ''}{formatRupees(Math.abs(transaction.amount))}
        </p>
        <p className="text-xs text-muted-foreground">
          {new Date(transaction.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </p>
      </div>
    </div>
  );
});

TransactionRow.displayName = 'TransactionRow';

interface SimpleDashboardProps {
  initialData?: SimpleDashboardData | null;
  initialStartDate?: string;
  initialEndDate?: string;
}

export default function SimpleDashboard({
  initialData = null,
  initialStartDate,
  initialEndDate,
}: SimpleDashboardProps) {
  const { user, loading: authLoading } = useAuth();
  const { addToast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showLegend, setShowLegend] = useState<boolean>(false);
  const [isDateSheetOpen, setIsDateSheetOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [cacheStatus, setCacheStatus] = useState<'fresh' | 'stale' | null>(initialData ? 'fresh' : null);
  const hasBootstrappedRef = useRef(Boolean(initialData));
  
  // Pull-to-refresh state
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [showChartSeries, setShowChartSeries] = useState({ credits: true, debits: true });
  
  // Transaction detail/action state
  const [selectedTransaction, setSelectedTransaction] = useState<SimpleDashboardData['recentTransactions'][0] | null>(null);
  const [isTransactionSheetOpen, setIsTransactionSheetOpen] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<SimpleDashboardData['recentTransactions'][0] | null>(null);
  const [pendingTransactions, setPendingTransactions] = useState<Set<string>>(new Set());
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [formInitialData, setFormInitialData] = useState<Partial<TransactionFormData> | undefined>();
  
  // Date range state
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const initialStart = initialStartDate ? new Date(initialStartDate) : defaultStart;
  const initialEnd = initialEndDate ? new Date(initialEndDate) : defaultEnd;
  
  const [startDate, setStartDate] = useState(() =>
    initialStartDate ?? initialStart.toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(() =>
    initialEndDate ?? initialEnd.toISOString().split('T')[0]
  );
  const defaultStartISO = defaultStart.toISOString().split('T')[0];
  const defaultEndISO = defaultEnd.toISOString().split('T')[0];

  const [quickRange, setQuickRange] = useState<QuickRange>(() => {
    if (initialStartDate && initialEndDate) {
      if (initialStartDate !== defaultStartISO || initialEndDate !== defaultEndISO) {
        return 'custom';
      }
    }
    return 'month';
  });
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(initialStart.getTime()),
    to: new Date(initialEnd.getTime()),
  });

  // Online/offline detection
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Dashboard data state
  const [dashboardData, setDashboardData] = useState<SimpleDashboardData | null>(initialData);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [error, setError] = useState<Error | null>(null);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!user?.id || authLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      // Try to load cached data first
      const cached = await getCachedDashboard();
      if (cached) {
        setDashboardData(cached);
        setCacheStatus('stale');
      }

      const response = await fetch(
        `/api/dashboard-simple?userId=${user.id}&start=${startDate}&end=${endDate}`,
        {
          headers: { 'Accept': 'application/json' },
          cache: 'default'
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      setDashboardData(data);
      await setCachedDashboard(data);
      setCacheStatus('fresh');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch dashboard data');
      setError(error);
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, authLoading, startDate, endDate]);

  // Load dashboard data on mount and when dates change
  useEffect(() => {
    if (user && !authLoading) {
      if (hasBootstrappedRef.current) {
        hasBootstrappedRef.current = false;
        return;
      }
      fetchDashboardData();
    }
  }, [user, authLoading, fetchDashboardData]);

  // Refetch function
  const refetch = useCallback(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Chart height calculation - compressed for mobile
  const chartHeight = useMemo(() => {
    if (typeof window === 'undefined') return 220;
    const width = window.innerWidth;
    if (width < 640) return 180; // mobile - compressed
    if (width < 1024) return 220; // tablet
    return 280; // desktop
  }, []);

  // Responsive chart height
  useEffect(() => {
    const computeHeight = () => {
      const width = typeof window !== 'undefined' ? window.innerWidth : 1024;
      if (width < 640) return 180;
      if (width < 1024) return 220;
      return 280;
    };
    const onResize = () => {
      // Chart height is memoized, but we can trigger re-render if needed
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Optimize chart data for mobile (aggregate if too many points)
  const optimizedChartData = useMemo(() => {
    const data = dashboardData?.monthlyTrends;
    if (!data) return [];
    
    // If more than 12 points and on mobile, aggregate
    if (data.length > 12 && typeof window !== 'undefined' && window.innerWidth < 640) {
      // Aggregate to weekly if on mobile
      return data.slice(-12); // Just show last 12 months
    }
    return data;
  }, [dashboardData?.monthlyTrends]);

  const handleRefresh = useCallback(async () => {
    const startTime = Date.now();
    setIsUpdating(true);
    hapticMedium();
    try {
      await refetch();
      const latency = Date.now() - startTime;
      trackPullToRefresh({ latency, success: true }, user?.id);
      hapticSuccess();
    } catch (error) {
      const latency = Date.now() - startTime;
      trackPullToRefresh({ latency, success: false }, user?.id);
      hapticError();
    } finally {
      setIsUpdating(false);
    }
  }, [refetch, user?.id]);
  
  // Pull-to-refresh handlers
  const handlePullStart = useCallback(() => {
    setIsPulling(true);
  }, []);
  
  const handlePullMove = useCallback((distance: number) => {
    if (isPulling) {
      const maxDistance = 100;
      setPullDistance(Math.min(distance, maxDistance));
    }
  }, [isPulling]);
  
  const handlePullEnd = useCallback(() => {
    if (pullDistance > 50) {
      handleRefresh();
    }
    setPullDistance(0);
    setIsPulling(false);
  }, [pullDistance, handleRefresh]);
  
  // Pull-to-refresh touch handlers
  const pullStartY = useRef(0);
  const isPullingRef = useRef(false);
  
  useEffect(() => {
    const container = document.querySelector('.min-h-screen');
    if (!container) return;
    
    const handleTouchStart = (e: Event) => {
      const touchEvent = e as TouchEvent;
      if (window.scrollY === 0 && touchEvent.touches.length === 1) {
        pullStartY.current = touchEvent.touches[0].clientY;
        isPullingRef.current = true;
        handlePullStart();
      }
    };
    
    const handleTouchMove = (e: Event) => {
      const touchEvent = e as TouchEvent;
      if (isPullingRef.current && touchEvent.touches.length === 1) {
        const deltaY = touchEvent.touches[0].clientY - pullStartY.current;
        if (deltaY > 0 && window.scrollY === 0) {
          touchEvent.preventDefault();
          handlePullMove(deltaY);
        }
      }
    };
    
    const handleTouchEnd = () => {
      if (isPullingRef.current) {
        handlePullEnd();
        isPullingRef.current = false;
      }
    };
    
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handlePullStart, handlePullMove, handlePullEnd]);
  
  // Transaction handlers
  const handleTransactionTap = useCallback((transaction: SimpleDashboardData['recentTransactions'][0]) => {
    setSelectedTransaction(transaction);
    setIsTransactionSheetOpen(true);
  }, []);
  
  const handleTransactionEdit = useCallback((transaction: SimpleDashboardData['recentTransactions'][0]) => {
    setEditingTransaction(transaction);
    setShowTransactionForm(true);
    setIsTransactionSheetOpen(false);
  }, []);
  
  const handleTransactionDelete = useCallback(async (transaction: SimpleDashboardData['recentTransactions'][0]) => {
    // Optimistic delete
    setPendingTransactions(prev => new Set(prev).add(transaction.id));
    hapticError();
    
    try {
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete');
      
      // Invalidate query to refetch
      await refetch();
      addToast({
        type: 'success',
        title: 'Transaction deleted',
        message: 'The transaction has been removed',
        duration: 4000,
      });
      hapticSuccess();
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Delete failed',
        message: 'Could not delete transaction. Please try again.',
      });
    } finally {
      setPendingTransactions(prev => {
        const next = new Set(prev);
        next.delete(transaction.id);
        return next;
      });
    }
  }, [refetch, addToast]);
  
  // Chart series toggle
  const toggleChartSeries = useCallback((series: 'credits' | 'debits') => {
    setShowChartSeries(prev => ({
      ...prev,
      [series]: !prev[series],
    }));
    trackChartSeriesToggled(series, !showChartSeries[series], user?.id);
  }, [showChartSeries, user?.id]);

  const handleQuickRangeChange = useCallback((range: QuickRange) => {
    if (range === 'custom') {
      setQuickRange('custom');
      setIsDateSheetOpen(true);
      return;
    }

    const today = new Date();
    let start: Date, end: Date;
    
    switch (range) {
      case 'month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'lastMonth':
        const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        start = new Date(prev.getFullYear(), prev.getMonth(), 1);
        end = new Date(prev.getFullYear(), prev.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'quarter':
        const quarter = Math.floor(today.getMonth() / 3);
        start = new Date(today.getFullYear(), quarter * 3, 1);
        end = new Date(today.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999);
        break;
      case 'year':
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      case 'all':
        start = new Date(2020, 0, 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      default:
        return;
    }
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
    setDateRange({ from: start, to: end });
    setQuickRange(range);
    
    // Save preference
    try {
      localStorage.setItem('quickRange_dashboard', range);
    } catch {}
  }, []);

  // Remember last-used quick range
  useEffect(() => {
    try {
      const saved = localStorage.getItem('quickRange_dashboard');
      if (saved) handleQuickRangeChange(saved as QuickRange);
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refetch when date range changes
  const isInitialMount = useRef(true);
  
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return; // Skip on initial mount
    }
    
    // Refetch when date range changes (after initial mount)
    if (user && !authLoading && startDate && endDate) {
      refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]); // Only refetch when date range changes

  const handleDateRangeChange = useCallback((range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      const start = new Date(range.from);
      start.setHours(0, 0, 0, 0);
      const end = new Date(range.to);
      end.setHours(23, 59, 59, 999);
      
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
      setDateRange(range);
      setQuickRange('custom');
    } else if (range?.from) {
      setDateRange(range);
    }
  }, []);


  // Handle preset selection - MUST be before any early returns
  const handlePresetSelect = useCallback((preset: TransactionPreset) => {
    setFormInitialData(preset.defaults);
    setShowTransactionForm(true);
  }, []);

  // Handle full form open - MUST be before any early returns
  const handleFullFormOpen = useCallback(() => {
    setFormInitialData(undefined);
    setShowTransactionForm(true);
  }, []);

  // Show authentication loading
  if (authLoading) {
    return (
      <div className="container-fluid py-8">
        <PageSkeleton />
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-background pt-16">
        <div className="container-fluid">
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-foreground mb-4">Please Login</h3>
            <p className="text-muted-foreground mb-8">You need to be logged in to view your dashboard</p>
            <Link href="/auth">
              <Button>Go to Login</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading && !dashboardData) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="skeleton"
          className="container-fluid py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion() ? 0 : 0.3 }}
        >
        <PageSkeleton />
        </motion.div>
      </AnimatePresence>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-background pt-16">
        <div className="container-fluid">
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-foreground mb-2">No Data Available</h3>
            <p className="text-muted-foreground mb-4">Start by adding your first credit or debit transaction</p>
            <Link href="/transactions">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Transaction
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={dashboardData ? 'content' : 'loading'}
        className="w-full bg-background pb-20 lg:pb-8 relative"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: prefersReducedMotion() ? 0 : 0.3 }}
      >
        {/* Pull-to-refresh indicator */}
        {isPulling && pullDistance > 0 && (
          <motion.div
            className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur"
            initial={{ y: -60 }}
            animate={{ y: 0 }}
            exit={{ y: -60 }}
            style={{ height: `${Math.min(pullDistance, 60)}px` }}
          >
            <RefreshCw 
              className="w-5 h-5 animate-spin text-primary" 
              style={{ 
                transform: `rotate(${pullDistance * 3.6}deg)` 
              }}
            />
          </motion.div>
        )}
      
      {/* Sticky Header - Only on mobile, hidden on desktop where nav bar exists */}
      <div className="lg:hidden sticky top-16 z-30 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container-fluid py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Avatar */}
              <Avatar
                src={user?.avatarUrl}
                userId={user?.id || ''}
                size="sm"
                alt={`User avatar for ${user.name || user.email}`}
              />
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground truncate">
                  Welcome back, {user?.name?.split(' ')[0] || 'User'}! 
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Online/Offline Status */}
              {!isOnline && (
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Badge variant="outline" className="gap-1 text-xs cursor-pointer" onClick={() => {
                    if (!isOnline) {
                      hapticMedium();
                      handleRefresh();
                    }
                  }}>
                  <WifiOff className="w-3 h-3" />
                  Offline
                </Badge>
                </motion.div>
              )}
              {cacheStatus === 'stale' && isOnline && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Clock className="w-3 h-3" />
                  Cached
                </Badge>
              )}
              {/* Refresh Button */}
              <Button 
                onClick={handleRefresh} 
                variant="ghost" 
                size="sm" 
                disabled={isUpdating || isLoading}
                className="btn-touch"
                aria-label="Refresh dashboard data"
              >
                <RefreshCw className={`w-4 h-4 ${isUpdating || isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline ml-2">Refresh</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Page Header - Clean and minimal */}
      <div className="hidden lg:block border-b bg-background/50 backdrop-blur">
        <div className="container-fluid py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar
                src={user?.avatarUrl}
                userId={user?.id || ''}
                size="md"
                alt={`${user?.name || 'User'} avatar`}
              />
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  Welcome back, {user?.name?.split(' ')[0] || 'User'}! 
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Online/Offline Status */}
              {!isOnline && (
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Badge variant="outline" className="gap-1.5 text-xs">
                    <WifiOff className="w-3 h-3" />
                    Offline
                  </Badge>
                </motion.div>
              )}
              {cacheStatus === 'stale' && isOnline && (
                <Badge variant="secondary" className="gap-1.5 text-xs">
                  <Clock className="w-3 h-3" />
                  Cached
                </Badge>
              )}
              {/* Refresh Button */}
              <Button 
                onClick={handleRefresh} 
                variant="outline" 
                size="sm" 
                disabled={isUpdating || isLoading}
                className="gap-2"
                aria-label="Refresh dashboard data"
              >
                <RefreshCw className={`w-4 h-4 ${isUpdating || isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
              <Button
                onClick={() => setIsAddSheetOpen(true)}
                size="sm"
                className="hidden gap-2 sm:flex"
                aria-label="Add new transaction"
              >
                <Plus className="w-4 h-4" />
                <span>Add Transaction</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container-fluid py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6">
        {/* User Validation */}
        <UserValidation />

        {/* Date Range Filter - Desktop: Card, Mobile: Inline Button Only */}
        <div className="hidden md:block">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <CardTitle className="text-base font-semibold">Date Range</CardTitle>
                </div>
                {isUpdating && (
                  <Badge variant="secondary" className="gap-1.5">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Updating</span>
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <QuickRangeChips 
                  value={quickRange} 
                  onChange={handleQuickRangeChange} 
                  className="sm:flex"
                />
                <DateRangePicker
                  date={dateRange}
                  onDateChange={handleDateRangeChange}
                  disabled={isUpdating}
                  className="flex-1 min-w-[260px]"
                />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Mobile: Compact Filter Button */}
        <div className="md:hidden flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDateSheetOpen(true)}
            className="flex-1 justify-start gap-2"
            aria-label="Open date range picker"
          >
            <Filter className="w-4 h-4" />
            <span className="truncate">
              {quickRange === 'month' ? 'This Month' :
               quickRange === 'lastMonth' ? 'Last Month' :
               quickRange === 'quarter' ? 'This Quarter' :
               quickRange === 'year' ? 'This Year' :
               quickRange === 'all' ? 'All Time' :
               quickRange === 'custom' ? 'Custom Range' : 'Select Range'}
            </span>
          </Button>
          {isUpdating && (
            <Badge variant="secondary" className="gap-1">
              <RefreshCw className="w-3 h-3 animate-spin" />
            </Badge>
          )}
        </div>

        {/* Key Financial Metrics - Responsive Layout: 2x2 on mobile, single row on tablet+ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
          <CompactMetricCard
            label="Credits"
            value={formatRupees(dashboardData?.totalCredits ?? dashboardData?.totalIncome ?? 0)}
            icon={TrendingUp}
            iconColor="text-emerald-600 dark:text-emerald-400"
            isUpdating={isUpdating}
          />
          <CompactMetricCard
            label="Debits"
            value={formatRupees(dashboardData?.totalDebits ?? dashboardData?.totalExpenses ?? 0)}
            icon={TrendingDown}
            iconColor="text-red-600 dark:text-red-400"
            isUpdating={isUpdating}
          />
          <CompactMetricCard
            label="Net Savings"
            value={formatRupees(dashboardData?.netSavings ?? 0)}
            icon={PiggyBank}
            iconColor="text-blue-600 dark:text-blue-400"
            valueColor={(dashboardData?.netSavings ?? 0) >= 0 ? 'text-foreground' : 'text-red-600 dark:text-red-400'}
            isUpdating={isUpdating}
          />
          <CompactMetricCard
            label="Health Score"
            value={`${dashboardData?.financialHealthScore ?? 0}/100`}
            icon={Activity}
            iconColor="text-purple-600 dark:text-purple-400"
            isUpdating={isUpdating}
          />
        </div>

        {/* Chart Section - Compressed Height */}
        {/* Mobile: No Card Wrapper, Desktop: Card */}
        <div className={isUpdating ? 'opacity-75 transition-opacity duration-200' : ''}>
          {/* Mobile: Compact Header */}
          <div className="md:hidden mb-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Credits vs Debits</h3>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 px-2" 
                  onClick={() => setShowLegend(v => !v)}
                  aria-label={showLegend ? 'Hide legend' : 'Show legend'}
                >
                  {showLegend ? 'Hide' : 'Legend'}
                </Button>
                {isUpdating && (
                  <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>
          </div>
          
          {/* Desktop: Card Header */}
          <Card className="hidden md:block">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base sm:text-lg">Credits vs Debits Trend</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Bank transaction overview for the selected period
                  </CardDescription>
                </div>
                {isUpdating && (
                  <Badge variant="secondary" className="gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Loading</span>
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
            {optimizedChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={chartHeight}>
                <AreaChart data={optimizedChartData} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: chartHeight <= 180 ? '10px' : '12px' }}
                  />
                  <YAxis 
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: chartHeight <= 180 ? '10px' : '12px' }}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatRupees(value)}
                    labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  {(chartHeight > 180 || showLegend) && (
                    <Legend 
                      content={({ payload }) => (
                        <div className="flex items-center justify-center gap-4 mt-2">
                          {payload?.map((entry, index) => {
                            const series = entry.dataKey === 'credits' || entry.dataKey === 'income' ? 'credits' : 'debits';
                            return (
                              <button
                                key={index}
                                onClick={() => toggleChartSeries(series)}
                                className="flex items-center gap-2 text-xs cursor-pointer hover:opacity-80 transition-opacity"
                                style={{ opacity: showChartSeries[series] ? 1 : 0.3 }}
                                aria-label={`Toggle ${series} series`}
                              >
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: entry.color }}
                                />
                                <span>{entry.value}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    />
                  )}
                  <defs>
                    <linearGradient id="colorCredits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorDebits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  {showChartSeries.credits && (
                  <Area
                    type="monotone"
                    dataKey={optimizedChartData.some((t: any) => t.credits !== undefined) ? 'credits' : 'income'}
                    stroke="hsl(142, 76%, 36%)"
                    fillOpacity={1}
                    fill="url(#colorCredits)"
                    name="Credits"
                      animationDuration={prefersReducedMotion() ? 0 : 800}
                  />
                  )}
                  {showChartSeries.debits && (
                  <Area
                    type="monotone"
                    dataKey={optimizedChartData.some((t: any) => t.debits !== undefined) ? 'debits' : 'expenses'}
                    stroke="hsl(0, 84%, 60%)"
                    fillOpacity={1}
                    fill="url(#colorDebits)"
                    name="Debits"
                      animationDuration={prefersReducedMotion() ? 0 : 800}
                  />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] sm:h-[220px] flex items-center justify-center text-muted-foreground bg-muted/50 rounded-lg">
                <div className="text-center">
                  <p className="font-medium mb-1">No data available</p>
                  <p className="text-sm">Try selecting a different date range</p>
                </div>
              </div>
            )}
            </CardContent>
          </Card>
          
          {/* Mobile: Chart without Card wrapper */}
          <div className="md:hidden bg-muted/30 rounded-lg p-2">
            {optimizedChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={chartHeight}>
                <AreaChart data={optimizedChartData} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '10px' }}
                  />
                  <YAxis 
                    tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '10px' }}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatRupees(value)}
                    labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  {showLegend && (
                    <Legend 
                      content={({ payload }) => (
                        <div className="flex items-center justify-center gap-4 mt-2">
                          {payload?.map((entry, index) => {
                            const series = entry.dataKey === 'credits' || entry.dataKey === 'income' ? 'credits' : 'debits';
                            return (
                              <button
                                key={index}
                                onClick={() => toggleChartSeries(series)}
                                className="flex items-center gap-2 text-xs cursor-pointer hover:opacity-80 transition-opacity"
                                style={{ opacity: showChartSeries[series] ? 1 : 0.3 }}
                                aria-label={`Toggle ${series} series`}
                              >
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: entry.color }}
                                />
                                <span>{entry.value}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    />
                  )}
                  <defs>
                    <linearGradient id="colorCreditsMobile" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorDebitsMobile" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  {showChartSeries.credits && (
                  <Area
                    type="monotone"
                    dataKey={optimizedChartData.some((t: any) => t.credits !== undefined) ? 'credits' : 'income'}
                    stroke="hsl(142, 76%, 36%)"
                    fillOpacity={1}
                    fill="url(#colorCreditsMobile)"
                    name="Credits"
                      animationDuration={prefersReducedMotion() ? 0 : 800}
                  />
                  )}
                  {showChartSeries.debits && (
                  <Area
                    type="monotone"
                    dataKey={optimizedChartData.some((t: any) => t.debits !== undefined) ? 'debits' : 'expenses'}
                    stroke="hsl(0, 84%, 60%)"
                    fillOpacity={1}
                    fill="url(#colorDebitsMobile)"
                    name="Debits"
                      animationDuration={prefersReducedMotion() ? 0 : 800}
                  />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <p className="text-sm font-medium mb-1">No data available</p>
                  <p className="text-xs">Try selecting a different date range</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Secondary Metrics & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
          {/* Goals & Deadlines - Mobile: No Card, Desktop: Card */}
          <div>
            <Card className="hidden md:block">
              <CardHeader>
                <CardTitle className="text-base">Goals & Deadlines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                    <span className="text-sm text-muted-foreground">Active Goals</span>
                  </div>
                  <Link href="/goals" aria-label={`View ${dashboardData?.activeGoals || 0} active goals`}>
                    <Badge variant="secondary" className="cursor-pointer hover:bg-muted transition-colors">
                      {dashboardData?.activeGoals || 0}
                    </Badge>
                  </Link>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                    <span className="text-sm text-muted-foreground">Upcoming Deadlines</span>
                  </div>
                  <Link href="/deadlines" aria-label={`View ${dashboardData?.upcomingDeadlines || 0} upcoming deadlines`}>
                    <Badge variant="secondary" className="cursor-pointer hover:bg-muted transition-colors">
                      {dashboardData?.upcomingDeadlines || 0}
                    </Badge>
                  </Link>
                </div>
              </CardContent>
            </Card>
            
            {/* Mobile: Compact inline display */}
            <div className="md:hidden space-y-0 border rounded-lg divide-y">
              <div className="flex items-center justify-between py-2.5 px-3">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  <span className="text-sm text-foreground">Goals</span>
                </div>
                <Link href="/goals" aria-label={`View ${dashboardData?.activeGoals || 0} active goals`}>
                  <Badge variant="secondary" className="cursor-pointer">
                    {dashboardData?.activeGoals || 0}
                  </Badge>
                </Link>
              </div>
              <div className="flex items-center justify-between py-2.5 px-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  <span className="text-sm text-foreground">Deadlines</span>
                </div>
                <Link href="/deadlines" aria-label={`View ${dashboardData?.upcomingDeadlines || 0} upcoming deadlines`}>
                  <Badge variant="secondary" className="cursor-pointer">
                    {dashboardData?.upcomingDeadlines || 0}
                  </Badge>
                </Link>
              </div>
            </div>
          </div>

          {/* Recent Transactions Preview - Mobile: No Card, Desktop: Card */}
          <div>
            <Card className="hidden md:block">
              <CardHeader>
                <CardTitle className="text-base">Recent Transactions</CardTitle>
                <CardDescription>
                  Latest {Math.min(5, dashboardData?.recentTransactions?.length || 0)} transactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardData?.recentTransactions && dashboardData.recentTransactions.length > 0 ? (
                  <div className="space-y-2">
                    {dashboardData.recentTransactions.slice(0, 5).map((transaction: SimpleDashboardData['recentTransactions'][0]) => (
                      <TransactionRow 
                        key={transaction.id} 
                        transaction={transaction}
                        onTap={() => handleTransactionTap(transaction)}
                        onEdit={() => handleTransactionEdit(transaction)}
                        onDelete={() => handleTransactionDelete(transaction)}
                        isPending={pendingTransactions.has(transaction.id)}
                      />
                    ))}
                    <Link href="/transactions" className="block mt-3">
                      <Button variant="ghost" className="w-full text-sm" size="sm">
                        View All Transactions
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-4">No recent transactions</p>
                    <Link href="/transactions">
                      <Button size="sm" variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Transaction
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Mobile: Direct display without card */}
            <div className="md:hidden">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">Recent Transactions</h3>
                <Link href="/transactions">
                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                    View All
                  </Button>
                </Link>
              </div>
              {dashboardData?.recentTransactions && dashboardData.recentTransactions.length > 0 ? (
                <div className="space-y-2">
                  {dashboardData.recentTransactions.slice(0, 5).map((transaction: SimpleDashboardData['recentTransactions'][0]) => (
                    <TransactionRow 
                      key={transaction.id} 
                      transaction={transaction}
                      onTap={() => handleTransactionTap(transaction)}
                      onEdit={() => handleTransactionEdit(transaction)}
                      onDelete={() => handleTransactionDelete(transaction)}
                      isPending={pendingTransactions.has(transaction.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-3">No recent transactions</p>
                  <Link href="/transactions">
                    <Button size="sm" variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Transaction
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FAB - Mobile Only (Add Transaction) */}
      <FabButton
        icon={<Plus className="w-6 h-6" />}
        label="Add Transaction"
        onClick={() => setIsAddSheetOpen(true)}
        aria-label="Add new transaction"
      />
      
      {/* Transaction Add Sheet with Presets */}
      <TransactionAddSheet
        open={isAddSheetOpen}
        onClose={() => setIsAddSheetOpen(false)}
        onSelectPreset={handlePresetSelect}
        onOpenFullForm={handleFullFormOpen}
      />

      {/* Date Range Bottom Sheet - Mobile */}
      <FilterSheet 
        open={isDateSheetOpen} 
        onClose={() => setIsDateSheetOpen(false)} 
        title="Select Date Range"
      >
        <div className="space-y-4">
          <QuickRangeChips 
            value={quickRange} 
            onChange={(range) => {
              handleQuickRangeChange(range);
              if (range !== 'custom') {
                setIsDateSheetOpen(false);
              }
            }} 
          />
          <div>
            <label className="block text-sm font-medium mb-2">Custom Date Range</label>
            <div className="border rounded-lg p-3">
              <CalendarComponent
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={(range) => {
                  handleDateRangeChange(range);
                  if (range?.from && range?.to) {
                    setIsDateSheetOpen(false);
                  }
                }}
                numberOfMonths={1}
              />
            </div>
          </div>
        </div>
      </FilterSheet>
      
      {/* Transaction Detail Sheet */}
      <FilterSheet
        open={isTransactionSheetOpen}
        onClose={() => {
          setIsTransactionSheetOpen(false);
          setSelectedTransaction(null);
        }}
        title={selectedTransaction ? `Transaction Details` : ''}
      >
        {selectedTransaction && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">{selectedTransaction.title}</h3>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className={`text-lg font-bold ${
                  (selectedTransaction.type === 'credit' || selectedTransaction.type === 'income' || selectedTransaction.amount > 0)
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {(selectedTransaction.type === 'credit' || selectedTransaction.type === 'income' || selectedTransaction.amount > 0) ? '+' : ''}
                  {formatRupees(Math.abs(selectedTransaction.amount))}
                </span>
    </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-muted-foreground">Date</span>
                <span className="text-sm">{new Date(selectedTransaction.date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-muted-foreground">Category</span>
                <span className="text-sm">{selectedTransaction.financialCategory || selectedTransaction.category}</span>
              </div>
            </div>
            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  if (selectedTransaction) {
                    handleTransactionEdit(selectedTransaction);
                  }
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => {
                  if (selectedTransaction) {
                    handleTransactionDelete(selectedTransaction);
                    setIsTransactionSheetOpen(false);
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        )}
      </FilterSheet>
      
      {/* Error Retry Banner */}
      {error && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed top-16 left-0 right-0 z-40 bg-destructive/10 border-b border-destructive/20"
        >
          <div className="container-fluid py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <span className="text-sm font-medium">Failed to load dashboard data</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                hapticMedium();
                refetch();
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </motion.div>
      )}
      
      {/* Transaction Form Modal */}
      <TransactionFormModal
        open={showTransactionForm}
        initialData={formInitialData}
        transaction={editingTransaction ? {
          id: editingTransaction.id,
          userId: user?.id || '',
          transactionDate: new Date(editingTransaction.date),
          description: editingTransaction.title,
          creditAmount: editingTransaction.amount > 0 ? editingTransaction.amount : 0,
          debitAmount: editingTransaction.amount < 0 ? Math.abs(editingTransaction.amount) : 0,
          financialCategory: editingTransaction.financialCategory as any || 'EXPENSE',
          categoryId: '',
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        } : null}
        onClose={() => {
          setShowTransactionForm(false);
          setEditingTransaction(null);
          setFormInitialData(undefined);
        }}
        onSave={async (data: TransactionFormData) => {
          // TODO: Implement save logic
          const startTime = Date.now();
          try {
            const url = editingTransaction ? `/api/transactions/${editingTransaction.id}` : '/api/transactions';
            const method = editingTransaction ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
              method,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            });
            
            if (!response.ok) throw new Error('Failed to save');
            
            const latency = Date.now() - startTime;
            if (editingTransaction) {
              trackTransactionEdited({ latency, success: true }, user?.id);
            } else {
              trackTransactionAdded({ latency, success: true }, user?.id);
            }
            
            await refetch();
            addToast({
              type: 'success',
              title: editingTransaction ? 'Transaction updated' : 'Transaction added',
            });
            setShowTransactionForm(false);
            setEditingTransaction(null);
            setFormInitialData(undefined);
            hapticSuccess();
          } catch (error) {
            const latency = Date.now() - startTime;
            if (editingTransaction) {
              trackTransactionEdited({ latency, success: false }, user?.id);
            } else {
              trackTransactionAdded({ latency, success: false }, user?.id);
            }
            addToast({
              type: 'error',
              title: 'Error',
              message: 'Failed to save transaction',
            });
            hapticError();
          }
        }}
        categories={[]}
      />
      </motion.div>
    </AnimatePresence>
  );
}
