"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Goal } from "@/types/goals";
import type { DeadlinesResponse } from "@/types/deadlines";
import type { WishlistResponse } from "@/types/wishlist";
import {
  AlarmClock,
  ArrowRight,
  Bolt,
  CalendarDays,
  LayoutDashboard,
  Plus,
  ShoppingBag,
  Sparkles,
  History,
  PieChart,
  Wallet,
  RefreshCw,
  Target,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeGoals } from "@/lib/utils/goal-normalize";
import {
  formatCurrency,
  formatDateLabel,
  usePlansInsights,
} from "@/hooks/use-plans-insights";
import { fetchAndSaveGoalImage } from "@/app/actions/goal-images";
import { cn } from "@/lib/utils";
import GoalsPageClient from "@/app/(app)/goals/page-client";
import DeadlinesPageClient from "@/app/(app)/deadlines/page-client";
import WishlistPageClient from "@/app/(app)/wishlist/page-client";

export interface PlansBootstrap {
  goals: Goal[];
  deadlines: DeadlinesResponse;
  wishlist: WishlistResponse;
}

interface PlansPageClientProps {
  bootstrap: PlansBootstrap;
  userId: string;
  defaultTab?: string;
}

export default function PlansPageClient({ bootstrap, userId, defaultTab = "Overview" }: PlansPageClientProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const router = useRouter();

  // Keep goals synced
  const [goals, setGoals] = useState<Goal[]>(() => normalizeGoals(bootstrap.goals));
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setGoals(normalizeGoals(bootstrap.goals));
  }, [bootstrap.goals]);

  // Insight hooks
  const {
    goalStats
  } = usePlansInsights({
    goals,
    deadlines: bootstrap.deadlines,
    wishlist: bootstrap.wishlist,
  });

  const totalTargetAmount = goalStats.target;
  const totalCurrentAmount = goalStats.invested;

  const refreshModule = async () => {
    setIsRefreshing(true);
    // In a real app, this would re-fetch bootstrap data
    setTimeout(() => setIsRefreshing(false), 800);
  };

  // Helpers for filtering
  const upcomingDeadlines = useMemo(() => {
    const data = bootstrap.deadlines.data || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return data
      .filter(d => !d.isCompleted && new Date(d.dueDate) >= today)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [bootstrap.deadlines.data]);

  const wishlistItems = useMemo(() => bootstrap.wishlist.data || [], [bootstrap.wishlist.data]);

  return (
    <div className="flex flex-col min-h-screen bg-background selection:bg-primary/10">
      {/* INDUSTRIAL_HEADER_V2.0 */}
      <header className="h-16 border-b border-border bg-background flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground leading-none">Financial_Intelligence</span>
            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mt-1 opacity-40">NODE_PLANS_AUDIT_SYSTEM_v2.0</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-6 ml-4 border-l border-border pl-6 h-10">
            {['Overview', 'Goals', 'Deadlines', 'Wishlist'].map((tab) => (
              <span
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "text-[9px] font-black uppercase tracking-widest cursor-pointer mt-0.5 relative h-full flex items-center",
                  activeTab === tab ? "text-foreground after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab}
              </span>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
           <Button 
            variant="outline" 
            size="sm" 
            className="rounded-none h-9 px-4 border-border bg-muted/20 font-black text-[9px] uppercase tracking-widest"
            onClick={refreshModule}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("w-3 h-3 mr-2", isRefreshing && "animate-spin")} />
            REFRESH_SYNC
          </Button>
          <Button 
            size="sm" 
            className="rounded-none h-9 px-6 font-black text-[9px] uppercase tracking-widest shadow-lg shadow-primary/20"
            onClick={() => {
              if (activeTab === 'Goals') router.push('/goals?action=new');
              else if (activeTab === 'Deadlines') router.push('/deadlines?action=new');
              else if (activeTab === 'Wishlist') router.push('/wishlist?action=new');
              else router.push('/goals?action=new');
            }}
          >
            <Plus className="w-3 h-3 mr-2" />
            INITIALIZE_ENTITY
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col max-w-none w-full border-x border-border bg-background">
        {activeTab === 'Overview' && (
          <div className="flex-1 flex flex-col">
            {/* Metric Strip */}
            <section className="grid grid-cols-1 md:grid-cols-4 border-b border-border">
              <div className="p-4 border-r border-border flex flex-col justify-between">
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">Cumulative_Capital</span>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black tabular-nums numeric tracking-tighter">{formatCurrency(totalTargetAmount).split('.')[0]}</span>
                    <span className="text-[8px] font-black text-muted-foreground/40 uppercase">INR</span>
                  </div>
                  <p className="text-[8px] font-bold mt-1 uppercase tracking-widest text-primary">
                    TARGET_AGGREGATE
                  </p>
                </div>
              </div>

              <div className="p-4 border-r border-border flex flex-col justify-between bg-muted/5">
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">Deployment_Velocity</span>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black tabular-nums numeric tracking-tighter">
                      {((totalCurrentAmount / (totalTargetAmount || 1)) * 100).toFixed(1)}
                    </span>
                    <span className="text-[8px] font-black text-muted-foreground/40 uppercase">%_COMPLETED</span>
                  </div>
                  <div className="w-full bg-border h-0.5 mt-2">
                    <div 
                      className="bg-foreground h-full" 
                      style={{ width: `${Math.min(100, (totalCurrentAmount / (totalTargetAmount || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 border-r border-border">
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">Active_Entities</span>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <span className="text-[7px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Goals</span>
                    <span className="text-sm font-black text-foreground tabular-nums numeric">{goals.length}</span>
                  </div>
                  <div>
                    <span className="text-[7px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Items</span>
                    <span className="text-sm font-black text-foreground tabular-nums numeric">{wishlistItems.length}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 flex flex-col justify-between bg-primary/[0.02]">
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary mb-4">Shortfall_Index</span>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black tabular-nums numeric tracking-tighter">
                    {formatCurrency(totalTargetAmount - totalCurrentAmount).split('.')[0]}
                  </span>
                  <Target className="w-4 h-4 text-primary" />
                </div>
              </div>
            </section>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
               {/* Left: Goals Audit */}
               <div className="lg:col-span-8 border-r border-border flex flex-col overflow-hidden bg-background">
                 <div className="h-10 px-6 border-b border-border bg-muted/20 flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">CRITICAL_OBJ_MATRIX</span>
                    <span onClick={() => setActiveTab('Goals')} className="text-[8px] font-black uppercase tracking-widest text-primary hover:underline cursor-pointer">VIEW_ALL_GOALS &rsaquo;</span>
                 </div>
                 
                 <div className="flex-1 overflow-auto p-4 space-y-px bg-border/20">
                    {goals.slice(0, 10).map(goal => (
                      <div key={goal.id} className="bg-background border border-border/50 p-4 group hover:bg-muted/5 transition-none">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="size-2 rounded-full bg-primary" />
                            <h4 className="text-[11px] font-black uppercase tracking-tight">{goal.title}</h4>
                          </div>
                          <span className="text-[8px] font-black font-mono text-muted-foreground uppercase tracking-widest">
                            {((goal.currentAmount / goal.targetAmount) * 100).toFixed(0)}%_SYNC
                          </span>
                        </div>
                        <div className="w-full bg-border h-1 rounded-none overflow-hidden">
                          <div className="bg-foreground h-full transition-all" style={{ width: `${(goal.currentAmount / goal.targetAmount) * 100}%` }} />
                        </div>
                        <div className="flex justify-between mt-2">
                          <span className="text-[9px] font-bold font-mono text-muted-foreground/60">{formatCurrency(goal.currentAmount)}</span>
                          <span className="text-[9px] font-black font-mono">{formatCurrency(goal.targetAmount)}</span>
                        </div>
                      </div>
                    ))}
                    {goals.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                         <Target className="size-12 text-muted-foreground opacity-20 mb-4" />
                         <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">NO_ACTIVE_TARGETS</span>
                      </div>
                    )}
                 </div>
               </div>

               {/* Right: Insights & Focus */}
               <div className="lg:col-span-4 flex flex-col bg-muted/5">
                 <div className="p-6 border-b border-border">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground mb-6">Strategic_Focus</h3>
                    <div className="space-y-6">
                      {upcomingDeadlines.slice(0, 3).map(deadline => (
                        <div key={deadline.id} className="p-4 border border-border bg-background relative overflow-hidden group">
                           <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
                           <div className="flex justify-between items-start mb-2">
                              <span className="text-[7px] font-black text-rose-500 uppercase tracking-widest">URGENT_DEADLINE</span>
                              <span className="text-[8px] font-black font-mono text-muted-foreground opacity-50">{new Date(deadline.dueDate).toLocaleDateString().toUpperCase()}</span>
                           </div>
                           <h5 className="text-[10px] font-black uppercase tracking-tight mb-2">{deadline.title}</h5>
                           <p className="text-[11px] font-black font-mono text-foreground">{formatCurrency(deadline.amount)}</p>
                        </div>
                      ))}
                      {upcomingDeadlines.length === 0 && (
                        <div className="p-8 border border-dashed border-border text-center">
                           <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-40">CHRONO_MAP_CLEAR</span>
                        </div>
                      )}
                    </div>
                 </div>

                 <div className="p-6 flex-1 bg-background/50">
                    <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-4 block">Deployment_Advice</span>
                    <div className="p-4 border border-dashed border-border bg-muted/10">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase leading-relaxed tracking-tight">
                        Aggregated planning indicates a {((totalCurrentAmount / (totalTargetAmount || 1)) * 100).toFixed(1)}% milestone completion. 
                        Recommend stabilizing cash outflow to accelerate secondary objective acquisition.
                      </p>
                    </div>
                 </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'Goals' && <div className="flex-1 overflow-auto"><GoalsPageClient initialGoals={goals} userId={userId} layoutVariant="standalone" /></div>}
        {activeTab === 'Deadlines' && <div className="flex-1 overflow-auto"><DeadlinesPageClient initialDeadlines={bootstrap.deadlines} userId={userId} layoutVariant="standalone" /></div>}
        {activeTab === 'Wishlist' && <div className="flex-1 overflow-auto"><WishlistPageClient initialWishlist={bootstrap.wishlist} userId={userId} /></div>}
      </main>
    </div>
  );
}
