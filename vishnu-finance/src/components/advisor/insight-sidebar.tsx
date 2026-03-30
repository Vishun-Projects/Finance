"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, TrendingUp, TrendingDown, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface InsightSidebarProps {
    className?: string;
    userId: string;
}

export function InsightSidebar({ className, userId }: InsightSidebarProps) {
    const [stats, setStats] = useState({
        monthlySpend: 0,
        monthOverMonth: 0,
        topCategory: "Loading...",
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                // Fetch real transaction data for the current month
                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

                // Previous month for comparison
                const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
                const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

                const [currentRes, lastRes] = await Promise.all([
                    fetch(`/api/transactions?startDate=${startOfMonth}&endDate=${endOfMonth}&userId=${userId}&limit=1000`),
                    fetch(`/api/transactions?startDate=${startOfLastMonth}&endDate=${endOfLastMonth}&userId=${userId}&limit=1000`)
                ]);

                if (currentRes.ok && lastRes.ok) {
                    const currentData = await currentRes.json();
                    const lastData = await lastRes.json();

                    const currentTotal = currentData.data?.reduce((sum: number, t: any) => sum + (t.amount > 0 ? t.amount : 0), 0) || 0;
                    const lastTotal = lastData.data?.reduce((sum: number, t: any) => sum + (t.amount > 0 ? t.amount : 0), 0) || 0;

                    // Calculate Top Category
                    const categories: Record<string, number> = {};
                    currentData.data?.forEach((t: any) => {
                        if (t.amount > 0 && t.category) {
                            categories[t.category] = (categories[t.category] || 0) + t.amount;
                        }
                    });
                    const topCategoryEntry = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];

                    let momChange = 0;
                    if (lastTotal > 0) {
                        momChange = Math.round(((currentTotal - lastTotal) / lastTotal) * 100);
                    }

                    setStats({
                        monthlySpend: currentTotal,
                        monthOverMonth: momChange,
                        topCategory: topCategoryEntry ? topCategoryEntry[0] : "None",
                    });
                }
            } catch (error) {
                console.error("Failed to fetch insight stats", error);
                setStats(prev => ({ ...prev, topCategory: "Error loading" }));
            } finally {
                setIsLoading(false);
            }
        }

        if (userId) {
            fetchStats();
        }
    }, [userId]);

    return (
        <aside className={cn("w-72 flex flex-col border-r border-border bg-card p-6 overflow-y-auto custom-scrollbar", className)}>
            <div className="mb-8 px-2">
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-theme-secondary">Intelligence Audit</h2>
                <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-1 opacity-50">Real-time Data Synthesis</p>
            </div>

            <div className="space-y-4 mb-10">
                <div className="card-base p-4 border-l-4 border-l-primary/30 hover:border-l-primary transition-all cursor-pointer group">
                    <p className="text-[9px] text-muted-foreground mb-2 font-black uppercase tracking-widest">Monthly Throughput</p>
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-black uppercase tracking-tight text-foreground">Operational Spend</p>
                        {stats.monthOverMonth > 0 ? <TrendingUp className="h-3.5 w-3.5 text-rose-500" /> : <TrendingDown className="h-3.5 w-3.5 text-emerald-500" />}
                    </div>
                    <p className="text-2xl font-black text-foreground tracking-tighter tabular-nums mt-2">
                        {isLoading ? <span className="animate-pulse opacity-20">---</span> : `₹${stats.monthlySpend.toLocaleString()}`}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                        <Badge variant="outline" className={cn(
                            "text-[8px] font-black uppercase tracking-widest h-5 px-1.5",
                            stats.monthOverMonth > 0 ? "bg-rose-500/5 text-rose-500 border-rose-500/20" : "bg-emerald-500/5 text-emerald-500 border-emerald-500/20"
                        )}>
                            {stats.monthOverMonth > 0 ? "+" : ""}{stats.monthOverMonth}%
                        </Badge>
                        <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest opacity-40">vs Prev Cycle</span>
                    </div>
                </div>

                <div className="card-base p-4 border-l-4 border-l-border hover:border-l-primary/50 transition-all cursor-pointer">
                    <p className="text-[9px] text-muted-foreground mb-1 font-black uppercase tracking-widest">Peak Allocation</p>
                    <p className="text-xs font-black uppercase tracking-tight text-foreground">{stats.topCategory}</p>
                    <div className="mt-2 h-1 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary/30 w-2/3" />
                    </div>
                </div>
            </div>

            <div className="mt-auto pt-6 border-t border-border/50 px-2 leading-relaxed">
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">System Status</h2>
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Models Synthesized</span>
                    </div>
                    <div className="flex items-center gap-2 opacity-40">
                        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Neural Bridge Active</span>
                    </div>
                </div>
            </div>
        </aside>
    );
}
