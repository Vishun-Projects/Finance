"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, TrendingUp, TrendingDown, ArrowUpRight } from "lucide-react";

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
        <aside className={`w-72 flex flex-col border-r border-border bg-card/30 p-6 overflow-y-auto custom-scrollbar ${className}`}>
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-6">Financial Insights</h2>

            <div className="space-y-4 mb-10">
                <Card className="p-4 bg-card border border-border hover:border-foreground/20 transition-colors cursor-pointer group">
                    <p className="text-[10px] text-muted-foreground mb-2 font-bold uppercase tracking-wider">Current Month</p>
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-foreground"> Spending Trend</p>
                        {stats.monthOverMonth > 0 ? <TrendingUp className="h-4 w-4 text-red-500" /> : <TrendingDown className="h-4 w-4 text-emerald-500" />}
                    </div>
                    <p className="text-2xl font-light text-foreground tracking-tight">
                        {isLoading ? <span className="animate-pulse">...</span> : `₹${stats.monthlySpend.toLocaleString()}`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                        <span className={stats.monthOverMonth > 0 ? "text-red-500" : "text-emerald-500"}>
                            {stats.monthOverMonth > 0 ? "+" : ""}{stats.monthOverMonth}%
                        </span> vs last month
                    </p>
                </Card>

                <Card className="p-4 bg-card border border-border hover:border-foreground/20 transition-colors cursor-pointer">
                    <p className="text-[10px] text-muted-foreground mb-1 font-bold uppercase tracking-wider">Top Category</p>
                    <p className="text-sm font-medium text-foreground">{stats.topCategory}</p>
                    <p className="text-xs text-muted-foreground mt-1">Highest discretionary spend</p>
                </Card>
            </div>

            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-6">Monthly Audits</h2>
            <div className="space-y-3">
                {/* Placeholder for dynamic reports - in real app would fetch from /api/reports */}
                <div className="text-xs text-muted-foreground italic px-2">
                    No generated reports yet.
                </div>
            </div>
        </aside>
    );
}
