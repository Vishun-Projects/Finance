"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { chipVariants } from "@/design/variants";

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
                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
                const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
                const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

                const [currentRes, lastRes] = await Promise.all([
                    fetch(`/api/transactions?startDate=${startOfMonth}&endDate=${endOfMonth}&userId=${userId}&limit=1000`),
                    fetch(`/api/transactions?startDate=${startOfLastMonth}&endDate=${endOfLastMonth}&userId=${userId}&limit=1000`)
                ]);

                if (currentRes.ok && lastRes.ok) {
                    const currentData = await currentRes.json();
                    const lastData = await lastRes.json();

                    const currentTotal = currentData.data?.reduce((sum: number, t: { amount: number }) => sum + (t.amount > 0 ? t.amount : 0), 0) || 0;
                    const lastTotal = lastData.data?.reduce((sum: number, t: { amount: number }) => sum + (t.amount > 0 ? t.amount : 0), 0) || 0;

                    const categories: Record<string, number> = {};
                    currentData.data?.forEach((t: { amount: number; category?: string }) => {
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
        <aside className={cn("flex w-72 flex-col overflow-y-auto border-r border-border bg-surface p-6 custom-scrollbar", className)}>
            <div className="mb-8 px-1">
                <h2 className="text-sm font-medium text-foreground">Insights</h2>
                <p className="mt-1 text-xs text-hint">Based on your recent activity</p>
            </div>

            <div className="mb-10 space-y-4">
                <div className="card-base p-4">
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-hint">Monthly spend</p>
                    <div className="mb-1 flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground">Total outflow</p>
                        {stats.monthOverMonth > 0
                            ? <TrendingUp className="size-3.5 text-danger" />
                            : <TrendingDown className="size-3.5 text-success" />}
                    </div>
                    <p className="mt-2 text-2xl font-medium tabular-nums text-foreground">
                        {isLoading ? <span className="animate-pulse opacity-20">---</span> : `₹${stats.monthlySpend.toLocaleString()}`}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                        <Badge variant="outline" className={chipVariants({
                            variant: stats.monthOverMonth > 0 ? 'danger' : 'success',
                        })}>
                            {stats.monthOverMonth > 0 ? "+" : ""}{stats.monthOverMonth}%
                        </Badge>
                        <span className="text-xs text-hint">vs last month</span>
                    </div>
                </div>

                <div className="card-base p-4">
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-hint">Top category</p>
                    <p className="text-sm font-medium text-foreground">{stats.topCategory}</p>
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full w-2/3 bg-primary/30" />
                    </div>
                </div>
            </div>

            <div className="mt-auto border-t border-border px-1 pt-6">
                <h2 className="mb-4 text-sm font-medium text-foreground">Status</h2>
                <div className="space-y-2 text-xs text-muted">
                    <div className="flex items-center gap-2">
                        <div className="size-1.5 rounded-full bg-success" />
                        <span>Models ready</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="size-1.5 rounded-full bg-hint" />
                        <span>Advisor connected</span>
                    </div>
                </div>
            </div>
        </aside>
    );
}
