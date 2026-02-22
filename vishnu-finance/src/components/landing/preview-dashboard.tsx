"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, ArrowRight, Car, Coffee, CreditCard, MonitorPlay, ShoppingBag, Sparkles, TrendingUp } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";

interface PreviewData {
    transactions: Array<{
        id: string;
        date: string;
        description: string;
        amount: number;
        category: string;
        type: 'income' | 'expense';
    }>;
    chartData: Array<{
        month: string;
        income: number;
        expenses: number;
    }>;
    insight: string;
}

const defaultMockData: PreviewData = {
    transactions: [
        { id: '1', date: '2026-02-22', description: 'Apple Store', amount: 14900, category: 'Shopping', type: 'expense' },
        { id: '2', date: '2026-02-21', description: 'Salary Deposit', amount: 250000, category: 'Income', type: 'income' },
        { id: '3', date: '2026-02-20', description: 'Uber Rides', amount: 1200, category: 'Transport', type: 'expense' },
        { id: '4', date: '2026-02-19', description: 'Starbucks', amount: 450, category: 'Food', type: 'expense' },
    ],
    chartData: [
        { month: 'Sep', income: 240000, expenses: 180000 },
        { month: 'Oct', income: 250000, expenses: 170000 },
        { month: 'Nov', income: 260000, expenses: 190000 },
        { month: 'Dec', income: 250000, expenses: 220000 },
        { month: 'Jan', income: 270000, expenses: 160000 },
        { month: 'Feb', income: 250000, expenses: 140000 },
    ],
    insight: "Your savings rate has improved by 15% this month! Keep focusing on reducing discretionary spend.",
};

interface PreviewDashboardProps {
    data: PreviewData | null;
    isLoading: boolean;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    Food: <Coffee className="w-4 h-4" />,
    Shopping: <ShoppingBag className="w-4 h-4" />,
    Transport: <Car className="w-4 h-4" />,
    Entertainment: <MonitorPlay className="w-4 h-4" />,
    Utilities: <Activity className="w-4 h-4" />,
    Default: <CreditCard className="w-4 h-4" />
};



export function PreviewDashboard({ data, isLoading }: PreviewDashboardProps) {

    if (isLoading) {
        return (
            <div className="w-full max-w-2xl mx-auto space-y-6 animate-pulse">
                <Card className="border-white/10 shadow-lg bg-white/5 backdrop-blur-2xl rounded-[2rem]">
                    <CardHeader>
                        <Skeleton className="h-6 w-1/3 rounded-lg bg-white/20" />
                        <Skeleton className="h-4 w-2/3 rounded-lg mt-2 bg-white/10" />
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px] w-full bg-slate-900/40 backdrop-blur-3xl rounded-xl border border-white/5" />
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border-white/10 shadow-lg bg-slate-900/40 backdrop-blur-3xl rounded-3xl">
                        <CardHeader>
                            <Skeleton className="h-5 w-32 rounded-lg bg-slate-700/50" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex justify-between items-center">
                                    <div className="flex gap-3">
                                        <Skeleton className="h-10 w-10 rounded-xl bg-slate-800/30" />
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-24 rounded bg-slate-700/50" />
                                            <Skeleton className="h-3 w-16 rounded bg-slate-800/30" />
                                        </div>
                                    </div>
                                    <Skeleton className="h-4 w-16 rounded bg-slate-700/50" />
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="border-white/10 shadow-lg bg-slate-900/40 backdrop-blur-3xl rounded-3xl">
                        <CardHeader>
                            <Skeleton className="h-5 w-32 rounded-lg bg-slate-700/50" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-32 w-full rounded-2xl bg-slate-800/30" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    const displayData = data || defaultMockData;

    const getIcon = (category: string) => {
        const key = Object.keys(CATEGORY_ICONS).find(k => category.toLowerCase().includes(k.toLowerCase()));
        return key ? CATEGORY_ICONS[key] : CATEGORY_ICONS.Default;
    };

    return (
        <div className="w-full max-w-2xl mx-auto space-y-6 relative">
            {!data && (
                <div className="absolute inset-0 z-50 bg-slate-950/40 backdrop-blur-sm rounded-[2rem] flex flex-col items-center justify-center border border-white/10 overflow-hidden">
                    <div className="bg-white/10 backdrop-blur-xl shadow-2xl rounded-2xl p-8 text-center max-w-sm border border-white/20 transform transition-all hover:scale-105 duration-300">
                        <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto shadow-inner shadow-blue-400/30 mb-4 animate-bounce border border-blue-400/30">
                            <Sparkles className="w-8 h-8 text-blue-400" />
                        </div>
                        <h4 className="text-xl font-bold text-white tracking-tight mb-2">Unlock Your Dashboard</h4>
                        <p className="text-sm text-white/60 leading-relaxed">Enter your lifestyle details to see your personalized AI-generated financial future.</p>
                    </div>
                </div>
            )}
            <Card className="border border-white/10 shadow-2xl bg-white/5 backdrop-blur-3xl hover:shadow-[0_20px_50px_rgba(59,130,246,0.15)] transition-all duration-700 overflow-hidden relative rounded-[2rem]">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-blue-500/20 via-purple-500/10 to-transparent rounded-full blur-[80px] -z-10 translate-x-1/3 -translate-y-1/3"></div>
                <CardHeader className="pb-2 px-8 pt-8">
                    <CardTitle className="flex items-center gap-2 text-xl font-bold text-white tracking-tight">
                        <TrendingUp className="w-5 h-5 text-blue-400" />
                        Cash Flow Projection
                    </CardTitle>
                    <CardDescription className="text-white/60">A 6-month AI projection based on your profile.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[250px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={displayData.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(value) => `₹${value / 1000}k`} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(12px)', color: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
                                    formatter={(value: number) => [`₹${value.toLocaleString()}`, undefined]}
                                />
                                <Area type="monotone" dataKey="income" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                                <Area type="monotone" dataKey="expenses" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-white/10 shadow-lg bg-white/5 backdrop-blur-2xl rounded-3xl">
                    <CardHeader className="pb-3 border-b border-white/5">
                        <CardTitle className="text-base font-bold text-white">Recent Transactions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5 pt-5">
                        {displayData.transactions.slice(0, 4).map((t, i) => (
                            <div key={i} className="flex justify-between items-center group">
                                <div className="flex gap-3 items-center">
                                    <div className={`p-2.5 rounded-xl border ${t.type === 'expense' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'} group-hover:scale-110 transition-transform`}>
                                        {getIcon(t.category)}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-white/90 line-clamp-1">{t.description}</h4>
                                        <span className="text-xs text-white/50 font-medium">{t.category}</span>
                                    </div>
                                </div>
                                <div className={`text-sm font-bold tracking-tight ${t.type === 'expense' ? 'text-white/80' : 'text-blue-400'}`}>
                                    {t.type === 'expense' ? '-' : '+'}₹{t.amount.toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card className="border-blue-500/30 shadow-lg bg-gradient-to-br from-blue-600/80 to-indigo-600/80 backdrop-blur-2xl text-white relative overflow-hidden group rounded-3xl">
                    <div className="absolute top-0 right-0 p-8 w-[150%] h-[150%] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent -z-10 animate-pulse transition-opacity"></div>
                    <CardHeader className="relative z-10 pb-2">
                        <CardTitle className="text-base font-bold flex items-center gap-2 text-white/90">
                            <Sparkles className="w-5 h-5 text-blue-200" />
                            AI Insight
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <p className="text-lg font-medium leading-snug text-white/95">
                            &quot;{displayData.insight}&quot;
                        </p>
                        <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                            <span className="text-sm font-semibold text-white/80">Ready to start?</span>
                            <div className="w-8 h-8 rounded-full bg-white/20 hover:bg-white text-white hover:text-blue-600 flex items-center justify-center shadow-lg transition-colors backdrop-blur-sm border border-white/30">
                                <ArrowRight className="w-4 h-4" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div >
    );
}
