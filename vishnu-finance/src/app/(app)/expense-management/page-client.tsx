
'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
    LayoutDashboard, Heart, Receipt, BrainCircuit,
    Cog, Bell, Plus as PlusIcon, Search as SearchIcon,
    Calendar as LucideCalendar, ChevronDown as LucideChevronDown,
    ShoppingCart as LucideShoppingCart, Utensils, Zap,
    ArrowUp, ChevronLeft as LucideChevronLeft, ChevronRight as LucideChevronRight,
    Wallet, ShoppingBag, FileText, Download, Filter
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useToast } from '@/contexts/ToastContext';
import { Transaction, TransactionCategory } from '@/types';
import { cn } from '@/lib/utils';
import { calculateTotalsByCategory, formatCurrency } from '@/lib/transaction-utils';
import TransactionFormModal, { TransactionFormData } from '@/components/transaction-form-modal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

interface ExpenseManagementPageClientProps {
    bootstrap: {
        transactions: Transaction[];
        categories: any[];
        pagination: any;
        totals: any;
        range: any;
        userId: string;
    };
}

type Period = 'daily' | 'weekly' | 'monthly';

export default function ExpenseManagementPageClient({ bootstrap }: ExpenseManagementPageClientProps) {
    const { user } = useAuth();
    const { formatCurrency: formatCurrencyFunc } = useCurrency();
    const { success, error: showError } = useToast();

    const [transactions, setTransactions] = useState<Transaction[]>(bootstrap.transactions);
    const [categories] = useState(bootstrap.categories);
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [period, setPeriod] = useState<Period>('daily');
    const [dateRangePickerOpen, setDateRangePickerOpen] = useState(false);

    // Date range state
    const [dateRange, setDateRange] = useState({
        start: new Date(bootstrap.range.startDate),
        end: new Date(bootstrap.range.endDate)
    });

    // Handle period changes to update date range
    useEffect(() => {
        const end = new Date();
        let start = new Date();

        if (period === 'daily') {
            start = startOfMonth(end);
        } else if (period === 'weekly') {
            start = subDays(end, 7);
        } else if (period === 'monthly') {
            start = startOfMonth(subDays(end, 30));
        }

        setDateRange({ start, end });
    }, [period]);

    const formatAmount = useCallback(
        (value: number) => {
            const safeValue = Number.isFinite(value) ? value : 0;
            return formatCurrencyFunc ? formatCurrencyFunc(safeValue) : formatCurrency(safeValue);
        },
        [formatCurrencyFunc],
    );

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const tDate = new Date(t.transactionDate);
            const isInRange = isWithinInterval(tDate, { start: dateRange.start, end: dateRange.end });

            if (!isInRange) return false;

            if (searchTerm) {
                const query = searchTerm.toLowerCase();
                return (
                    (t.description || '').toLowerCase().includes(query) ||
                    (t.store || '').toLowerCase().includes(query) ||
                    (t.category?.name || '').toLowerCase().includes(query) ||
                    (t.creditAmount || t.debitAmount || 0).toString().includes(query)
                );
            }
            return true;
        });
    }, [transactions, searchTerm, dateRange]);

    const totals = useMemo(() => calculateTotalsByCategory(filteredTransactions), [filteredTransactions]);

    const daysInRange = useMemo(() => {
        const diff = Math.abs(dateRange.end.getTime() - dateRange.start.getTime());
        return Math.ceil(diff / (1000 * 60 * 60 * 24)) || 1;
    }, [dateRange]);

    const categoriesStats = useMemo(() => {
        const totalExpense = totals.expense || 1;
        const catMap = new Map<string, { amount: number, count: number }>();

        filteredTransactions.forEach(t => {
            if (t.financialCategory === 'EXPENSE') {
                const catName = t.category?.name || 'Uncategorized';
                const current = catMap.get(catName) || { amount: 0, count: 0 };
                catMap.set(catName, {
                    amount: current.amount + (t.debitAmount || 0),
                    count: current.count + 1
                });
            }
        });

        return Array.from(catMap.entries())
            .map(([name, stats]) => ({
                name,
                amount: stats.amount,
                count: stats.count,
                percent: Math.round((stats.amount / totalExpense) * 100)
            }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);
    }, [filteredTransactions, totals.expense]);

    const handleSave = async (data: TransactionFormData) => {
        try {
            const transactionId = editingTransaction?.id;
            const action = transactionId ? 'transactions_update' : 'transactions_create';

            const response = await fetch('/api/app', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    ...(transactionId ? { id: transactionId } : {}),
                    ...data,
                    userId: bootstrap.userId
                }),
            });

            if (!response.ok) throw new Error('Failed to save transaction');

            success('Success', transactionId ? 'Transaction updated' : 'Transaction added');
            setShowForm(false);
            setEditingTransaction(null);

            // Refresh logic
            const refreshRes = await fetch(`/api/app`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'transactions_list',
                    startDate: bootstrap.range.startDate,
                    endDate: bootstrap.range.endDate,
                    pageSize: 100
                })
            });
            if (refreshRes.ok) {
                const freshData = await refreshRes.json();
                setTransactions(freshData.transactions || []);
            }
        } catch (error) {
            showError('Error', 'Failed to save transaction');
        }
    };

    return (
        <div className="flex bg-background text-foreground font-sans min-h-screen w-full antialiased overflow-hidden">
            {/* Main Content Area (Unified Layout) */}
            <main className="flex-1 flex flex-col min-w-0 bg-background border-r border-border">
                <header className="h-16 border-b border-border flex items-center justify-between px-6 shrink-0 bg-card/30 backdrop-blur-sm">
                    <div className="flex items-center gap-4">
                        <h1 className="text-lg font-bold tracking-tight">Expense Management</h1>
                        <span className="text-muted-foreground/30 font-light">/</span>
                        <span className="text-muted-foreground text-sm font-medium">Dashboard</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                            <Bell size={20} />
                        </Button>
                        <div className="h-8 w-[1px] bg-border mx-2"></div>
                        <Button
                            onClick={() => setShowForm(true)}
                            className="bg-foreground text-background hover:bg-foreground/90 font-bold px-4 rounded-lg flex items-center gap-2 transition-all active:scale-95"
                        >
                            <PlusIcon size={16} />
                            Add Transaction
                        </Button>
                    </div>
                </header>

                {/* Filters Bar */}
                <div className="p-6 pb-4 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex-1 max-w-xl">
                        <div className="relative group">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4 group-focus-within:text-foreground transition-colors" />
                            <Input
                                type="text"
                                placeholder="Search transactions, merchants, categories..."
                                className="w-full bg-card/50 border-border rounded-lg pl-10 pr-4 py-2.5 text-sm focus-visible:ring-1 focus-visible:ring-foreground placeholder:text-muted-foreground/50 transition-all outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center bg-card/50 border border-border rounded-lg p-1">
                            {(['daily', 'weekly', 'monthly'] as Period[]).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    className={cn(
                                        "p-1.5 px-3 text-xs font-semibold rounded capitalize transition-all",
                                        period === p ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>

                        <Popover open={dateRangePickerOpen} onOpenChange={setDateRangePickerOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="gap-2 bg-card/50 border-border font-medium text-xs">
                                    <LucideCalendar size={14} />
                                    {format(dateRange.start, 'MMM dd')} - {format(dateRange.end, 'MMM dd, yyyy')}
                                    <LucideChevronDown size={12} />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={dateRange.start}
                                    selected={{ from: dateRange.start, to: dateRange.end }}
                                    onSelect={(range) => {
                                        if (range?.from) {
                                            setDateRange({
                                                start: range.from,
                                                end: range.to || range.from
                                            });
                                            if (range.to) setDateRangePickerOpen(false);
                                        }
                                    }}
                                    numberOfMonths={1}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                {/* Table View */}
                <div className="flex-1 overflow-auto p-6 pt-2 custom-scrollbar">
                    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-muted/30">
                                    <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Date</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Merchant / Store</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Category</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">
                                            No transactions found for the selected period
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTransactions.map((t) => (
                                        <tr
                                            key={t.id}
                                            onClick={() => {
                                                setEditingTransaction(t);
                                                setShowForm(true);
                                            }}
                                            className="hover:bg-muted/30 transition-colors cursor-pointer group"
                                        >
                                            <td className="px-6 py-4 text-sm font-medium text-muted-foreground">
                                                {format(new Date(t.transactionDate), 'MMM dd, yyyy')}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-semibold text-foreground flex items-center gap-3">
                                                <div className="size-8 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
                                                    <CategoryIcon category={t.category?.name || ''} />
                                                </div>
                                                <span className="truncate max-w-[200px]">{t.store || t.description}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                                                    t.financialCategory === 'INCOME' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-muted text-muted-foreground border border-border"
                                                )}>
                                                    {t.category?.name || 'General'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                                    <div className={cn("size-1.5 rounded-full", t.accountStatementId ? "bg-emerald-500" : "bg-amber-500")}></div>
                                                    {t.accountStatementId ? 'Cleared' : 'Pending'}
                                                </div>
                                            </td>
                                            <td className={cn(
                                                "px-6 py-4 text-sm font-bold text-right",
                                                t.financialCategory === 'INCOME' ? "text-emerald-500" : "text-foreground"
                                            )}>
                                                {t.financialCategory === 'INCOME' ? '+' : '-'}{formatAmount(t.creditAmount || t.debitAmount || 0)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Analytics Panel (Right Sidebar) */}
            <aside className="w-80 lg:w-96 flex flex-col bg-card/30 overflow-y-auto custom-scrollbar shrink-0">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-bold tracking-tight">Analytics</h2>
                        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-bold border-border bg-background">
                            <Download size={14} />
                            Export
                        </Button>
                    </div>

                    {/* Monthly Spend Card */}
                    <div className="bg-card border border-border p-6 rounded-2xl mb-8 shadow-sm">
                        <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest mb-2">Monthly Expenditure</p>
                        <div className="flex items-end gap-3 mb-6">
                            <h3 className="text-3xl font-bold tracking-tighter">{formatAmount(totals.expense)}</h3>
                            <div className="bg-emerald-500/10 text-emerald-500 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center mb-1 border border-emerald-500/20">
                                <ArrowUp size={12} className="mr-0.5" />
                                12%
                            </div>
                        </div>

                        {/* Histogram Visual */}
                        <div className="h-20 flex items-end gap-2 w-full">
                            {[40, 30, 60, 100, 50, 35, 55].map((h, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "flex-1 transition-all duration-700 rounded-t-md",
                                        i === 3 ? "bg-foreground h-full shadow-[0_-4px_10px_rgba(0,0,0,0.1)]" : "bg-muted hover:bg-muted-foreground/20"
                                    )}
                                    style={{ height: `${h}%` }}
                                ></div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-8">
                        {/* Radial Chart Visual */}
                        <div className="relative flex justify-center py-4">
                            <div className="relative size-48">
                                <svg className="size-full -rotate-90">
                                    <circle
                                        cx="96" cy="96" r="88"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="12"
                                        className="text-muted/20"
                                    />
                                    <circle
                                        cx="96" cy="96" r="88"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="12"
                                        className="text-foreground transition-all duration-1000 ease-in-out"
                                        strokeDasharray={2 * Math.PI * 88}
                                        strokeDashoffset={2 * Math.PI * 88 * (1 - 0.7)} // Example 70% or logic-bound
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                    <p className="text-muted-foreground text-[10px] uppercase tracking-widest font-bold mb-0.5">Avg / Day</p>
                                    <p className="text-2xl font-black tracking-tight">{formatAmount(totals.expense / daysInRange)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Category Progress */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Top Categories</h4>
                                <Button variant="link" className="h-auto p-0 text-[10px] font-bold text-foreground">View All</Button>
                            </div>

                            <div className="space-y-5">
                                {categoriesStats.map((cat, i) => (
                                    <div key={i} className="group">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "size-2 rounded-full",
                                                    i === 0 ? "bg-foreground" : i === 1 ? "bg-muted-foreground" : "bg-muted-foreground/40"
                                                )}></div>
                                                <span className="text-sm font-bold text-foreground capitalize">{cat.name.toLowerCase()}</span>
                                            </div>
                                            <p className="text-xs font-bold">{formatAmount(cat.amount)}</p>
                                        </div>
                                        <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                                            <div
                                                className={cn(
                                                    "h-full transition-all duration-1000 delay-300",
                                                    i === 0 ? "bg-foreground" : "bg-muted-foreground/60"
                                                )}
                                                style={{ width: `${cat.percent}%` }}
                                            ></div>
                                        </div>
                                        <div className="flex justify-between mt-1.5">
                                            <p className="text-[9px] text-muted-foreground font-bold uppercase">{cat.count} Trans.</p>
                                            <p className="text-[9px] text-muted-foreground font-bold">{cat.percent}%</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Detailed Report CTA */}
                    <div className="mt-10 p-5 rounded-2xl bg-foreground text-background shadow-xl">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="p-2 bg-background/10 rounded-lg">
                                <FileText size={20} className="text-background" />
                            </div>
                            <div>
                                <p className="font-bold text-sm">Monthly Report</p>
                                <p className="text-[10px] text-background/60 mt-0.5">Your financial summary for October is ready for review.</p>
                            </div>
                        </div>
                        <Button className="w-full bg-background text-foreground hover:bg-background/90 text-xs font-bold h-9">
                            Generate Report
                        </Button>
                    </div>
                </div>
            </aside>

            <TransactionFormModal
                open={showForm}
                onClose={() => {
                    setShowForm(false);
                    setEditingTransaction(null);
                }}
                onSave={handleSave}
                transaction={editingTransaction}
                categories={categories}
            />

            <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: hsl(var(--muted-foreground) / 0.2); border-radius: 10px; }
      `}</style>
        </div>
    );
}

function CategoryIcon({ category }: { category: string }) {
    const cat = category.toLowerCase();
    if (cat.includes('tech') || cat.includes('apple') || cat.includes('electronic')) return <LucideShoppingCart className="size-4" />;
    if (cat.includes('food') || cat.includes('dine') || cat.includes('sushi')) return <Utensils className="size-4" />;
    if (cat.includes('utility') || cat.includes('bill') || cat.includes('con edison')) return <Zap className="size-4" />;
    return <ShoppingBag className="size-4" />;
}
