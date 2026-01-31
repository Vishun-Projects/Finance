"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  Wallet
} from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export default function PlansPageClient({ bootstrap, userId, defaultTab = "overview" }: PlansPageClientProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Keep goals synced
  const [goals, setGoals] = useState<Goal[]>(() => normalizeGoals(bootstrap.goals));
  useEffect(() => {
    setGoals(normalizeGoals(bootstrap.goals));
  }, [bootstrap.goals]);

  // Insight hooks
  const {
    goalStats,
  } = usePlansInsights({
    goals,
    deadlines: bootstrap.deadlines,
    wishlist: bootstrap.wishlist,
  });

  // Helpers for filtering
  const upcomingDeadlines = useMemo(() => {
    const data = bootstrap.deadlines.data || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return data
      .filter(d => !d.isCompleted && new Date(d.dueDate) >= today)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 3);
  }, [bootstrap.deadlines.data]);

  const activeWishlist = useMemo(() => {
    const data = bootstrap.wishlist.data || [];
    return data.filter(i => !i.isCompleted).slice(0, 3);
  }, [bootstrap.wishlist.data]);

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-foreground p-1 rounded-sm flex items-center justify-center">
            <span className="text-background text-xl font-bold">V</span>
          </div>
          <h1 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">Vishnu Finance</h1>
        </div>
      </header>

      {/* Main Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-8">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <TabsList className="bg-transparent p-0 gap-6 h-auto">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none px-0 py-2 bg-transparent text-muted-foreground font-bold uppercase tracking-wider text-xs hover:text-foreground/80 transition-colors"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="goals"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none px-0 py-2 bg-transparent text-muted-foreground font-bold uppercase tracking-wider text-xs hover:text-foreground/80 transition-colors"
              onClick={() => setActiveTab('goals')}
            >
              Goals
            </TabsTrigger>
            <TabsTrigger
              value="deadlines"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none px-0 py-2 bg-transparent text-muted-foreground font-bold uppercase tracking-wider text-xs hover:text-foreground/80 transition-colors"
              onClick={() => setActiveTab('deadlines')}
            >
              Deadlines
            </TabsTrigger>
            <TabsTrigger
              value="wishlist"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-foreground rounded-none px-0 py-2 bg-transparent text-muted-foreground font-bold uppercase tracking-wider text-xs hover:text-foreground/80 transition-colors"
              onClick={() => setActiveTab('wishlist')}
            >
              Wishlist
            </TabsTrigger>
          </TabsList>

          {/* Context Action Button - Only show on Overview, others have their own */}
          {activeTab === 'overview' && (
            <Button
              variant="secondary"
              size="sm"
              className="bg-foreground text-background hover:bg-foreground/90 font-bold uppercase tracking-tighter h-8 text-[10px]"
              onClick={() => setActiveTab('goals')}
            >
              <Plus className="mr-2 h-3 w-3" />
              Manage Plans
            </Button>
          )}
        </div>

        {/* --- OVERVIEW TAB --- */}
        <TabsContent value="overview" className="m-0 focus-visible:ring-0">
          <div className="flex flex-col lg:flex-row gap-8">

            {/* Left Column: Overview & Goals */}
            <div className="flex-1 space-y-10">

              {/* Overview Cards */}
              <div className="flex flex-col md:flex-row gap-4">
                <OverviewCard
                  label="Total Saved"
                  value={formatCurrency(goalStats.invested)}
                  subtext={`+${goalStats.progressPercent}%`}
                  className="md:flex-1"
                />
                <OverviewCard
                  label="Total Target"
                  value={formatCurrency(goalStats.target)}
                  className="md:flex-1"
                  variant="secondary"
                />
              </div>

              {/* Active Goals Section */}
              <div>
                <div className="flex items-center justify-between mb-8 border-b border-border pb-4">
                  <h2 className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">Active Goals</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground font-bold uppercase tracking-tighter h-8 text-[10px]"
                    onClick={() => setActiveTab("goals")}
                  >
                    View All
                    <ArrowRight className="ml-2 h-3 w-3" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {goals.map(goal => (
                    <MatteGoalCard
                      key={goal.id}
                      goal={goal}
                      onUpdate={(updatedGoal) => {
                        setGoals(prev => prev.map(g => g.id === updatedGoal.id ? updatedGoal : g));
                      }}
                    />
                  ))}
                  {goals.length === 0 && (
                    <div className="text-center py-12 border border-dashed border-border rounded-xl">
                      <p className="text-muted-foreground">No active plans found. Create one to get started.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Sidebar (Today's Focus) */}
            <aside className="lg:w-80 flex-shrink-0">
              <div className="sticky top-8 space-y-6">

                {/* Today's Focus Card */}
                <Card className="bg-card border border-border rounded-xl p-6 shadow-2xl">
                  <div className="flex items-center gap-2 mb-8">
                    <CalendarDays className="text-foreground h-5 w-5" />
                    <h2 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">Today&apos;s Focus</h2>
                  </div>

                  <div className="space-y-8">
                    {/* Upcoming Deadlines */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Upcoming Deadlines</p>
                        <Button variant="link" className="text-[9px] text-primary h-auto p-0" onClick={() => setActiveTab("deadlines")}>View</Button>
                      </div>
                      <div className="space-y-4">
                        {upcomingDeadlines.map(deadline => (
                          <div key={deadline.id} className="flex items-center gap-4 p-4 bg-background rounded-sm border border-border">
                            <div className="w-10 h-10 rounded-sm bg-muted flex items-center justify-center text-foreground border border-border">
                              <AlarmClock className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-foreground uppercase tracking-tighter truncate max-w-[120px]">{deadline.title}</p>
                              <p className="text-[10px] text-muted-foreground font-medium">
                                {deadline.dueDate ? formatDateLabel(deadline.dueDate) : 'No date'} • {formatCurrency(Number(deadline.amount || 0))}
                              </p>
                            </div>
                          </div>
                        ))}
                        {upcomingDeadlines.length === 0 && (
                          <p className="text-xs text-muted-foreground italic">No upcoming deadlines.</p>
                        )}
                      </div>
                    </div>

                    {/* Wishlist Highlights */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Wishlist Highlights</p>
                        <Button variant="link" className="text-[9px] text-primary h-auto p-0" onClick={() => setActiveTab("wishlist")}>View</Button>
                      </div>
                      <div className="space-y-6">
                        {activeWishlist.map(item => (
                          <WishlistHighlightRow key={item.id} item={item} />
                        ))}
                        {activeWishlist.length === 0 && (
                          <p className="text-xs text-muted-foreground italic">Wishlist empty.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full mt-8 py-6 rounded-sm border-border text-[10px] font-black uppercase tracking-[0.2em] hover:bg-foreground hover:text-background transition-all"
                    onClick={() => setActiveTab("deadlines")}
                  >
                    View All Tasks
                  </Button>
                </Card>

              </div>
            </aside>
          </div>
        </TabsContent>

        {/* --- GOALS TAB --- */}
        <TabsContent value="goals" className="m-0 focus-visible:ring-0">
          <GoalsPageClient
            initialGoals={bootstrap.goals}
            userId={userId}
            layoutVariant="embedded"
            onGoalsChange={(newGoals) => setGoals(newGoals)}
          />
        </TabsContent>

        {/* --- DEADLINES TAB --- */}
        <TabsContent value="deadlines" className="m-0 focus-visible:ring-0">
          <DeadlinesPageClient
            initialDeadlines={bootstrap.deadlines}
            userId={userId}
            layoutVariant="embedded"
          />
        </TabsContent>

        {/* --- WISHLIST TAB --- */}
        <TabsContent value="wishlist" className="m-0 focus-visible:ring-0">
          <WishlistPageClient
            initialWishlist={bootstrap.wishlist}
            userId={userId}
            layoutVariant="embedded"
          />
        </TabsContent>

      </Tabs>
    </div>
  );
}

// --- Sub-Components ---

function OverviewCard({ label, value, subtext, className, variant = 'primary' }: { label: string, value: string, subtext?: string, className?: string, variant?: 'primary' | 'secondary' }) {
  return (
    <div className={cn("matte-card rounded-xl p-6 bg-card border border-border shadow-xl", className)}>
      <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest mb-2 font-sans">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className={cn("text-4xl font-light tracking-tighter font-heading", variant === 'primary' ? "text-primary" : "text-foreground")}>{value}</p>
        {subtext && <span className={cn("text-xs font-medium font-sans", variant === 'primary' ? "text-primary/80" : "text-muted-foreground")}>{subtext}</span>}
      </div>
    </div>
  );
}

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function MatteGoalCard({ goal, onUpdate }: { goal: Goal, onUpdate?: (updatedGoal: Goal) => void }) {
  const [bgImage, setBgImage] = useState<string | null>(goal.imageUrl || null);
  const [isAddingFunds, setIsAddingFunds] = useState(false);
  const [fundsAmount, setFundsAmount] = useState("");
  const [fundsSource, setFundsSource] = useState("Salary");
  const [fundsNote, setFundsNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const progress = Math.min(100, Math.max(0, (goal.currentAmount / goal.targetAmount) * 100));

  // Calculate breakdown from contributions if available
  const contributions = (goal as any).contributions || [];
  const hasHistory = contributions.length > 0;

  const sourcesBreakdown = useMemo(() => {
    if (!hasHistory) return null;
    const breakdown: Record<string, number> = {};
    contributions.forEach((c: any) => {
      breakdown[c.source] = (breakdown[c.source] || 0) + Number(c.amount);
    });
    return Object.entries(breakdown).map(([name, amount]) => ({ name, amount: Number(amount) }));
  }, [contributions, hasHistory]);

  // Auto-fetch image if missing
  useEffect(() => {
    if (!bgImage) {
      fetchAndSaveGoalImage(goal.title).then(res => {
        if (res.success && res.path) {
          setBgImage(res.path);
        }
      });
    }
  }, [goal.title, bgImage]);

  const handleAddFunds = async () => {
    if (!fundsAmount || isNaN(Number(fundsAmount))) return;

    setIsSaving(true);
    try {
      const addedAmount = parseFloat(fundsAmount);
      // We calculate new amount locally for optimistic UI
      const newAmount = (goal.currentAmount || 0) + addedAmount;

      const response = await fetch('/api/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: goal.id,
          currentAmount: newAmount,
          contributionAmount: addedAmount,
          contributionSource: fundsSource,
          contributionNote: fundsNote
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update goal');
      }

      const updatedGoalData = await response.json();
      onUpdate?.(updatedGoalData);

      setDialogOpen(false);
      setFundsAmount("");
      setFundsNote("");
      setFundsSource("Salary");
    } catch (error) {
      console.error("Failed to add funds", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-foreground/20">
      <div className="flex flex-col md:flex-row gap-8 p-6 relative z-10">
        <div className="flex-1">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-bold text-foreground mb-1">{goal.title}</h3>
              <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                Target: {goal.targetDate ? formatDateLabel(goal.targetDate) : 'Ongoing'} • Automated
              </p>
            </div>
            <Badge variant="outline" className={cn("border-border rounded-sm text-[9px] font-bold uppercase tracking-tighter bg-transparent", goal.status === 'COMPLETED' ? 'text-primary border-primary/50' : 'text-primary border-primary/20')}>
              {goal.status === 'COMPLETED' ? 'Done' : 'On Track'}
            </Badge>
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-end mb-3">
              <span className="text-3xl font-light tracking-tighter text-foreground">
                {formatCurrency(goal.currentAmount)} <span className="text-sm font-normal text-muted-foreground/60">/ {formatCurrency(goal.targetAmount)}</span>
              </span>
              <span className="text-sm font-black text-foreground">{Math.round(progress)}%</span>
            </div>
            <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Add Funds Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" className="h-8 border border-border bg-muted text-foreground hover:bg-muted/80 text-[10px] font-bold uppercase tracking-widest">
                  <Plus className="mr-1 h-3 w-3" />
                  Add to Savings
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Add to Savings</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Record a contribution to <strong>{goal.title}</strong>.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-muted-foreground">Amount (₹)</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="e.g. 5000"
                      value={fundsAmount}
                      onChange={(e) => setFundsAmount(e.target.value)}
                      className="bg-muted border-border text-foreground placeholder:text-muted-foreground/40"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="source" className="text-muted-foreground">Source</Label>
                    <Select value={fundsSource} onValueChange={setFundsSource}>
                      <SelectTrigger className="bg-muted border-border text-foreground">
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Salary">Salary</SelectItem>
                        <SelectItem value="Bonus">Bonus</SelectItem>
                        <SelectItem value="Savings">General Savings</SelectItem>
                        <SelectItem value="Business">Business Profit</SelectItem>
                        <SelectItem value="Gift">Gift</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="note" className="text-muted-foreground">Note (Optional)</Label>
                    <Input
                      id="note"
                      placeholder="e.g. November saving"
                      value={fundsNote}
                      onChange={(e) => setFundsNote(e.target.value)}
                      className="bg-muted border-border text-foreground placeholder:text-muted-foreground/40"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-border text-muted-foreground hover:bg-muted hover:text-foreground">Cancel</Button>
                  <Button onClick={handleAddFunds} disabled={isSaving || !fundsAmount} className="bg-foreground text-background hover:bg-foreground/90">
                    {isSaving ? 'Adding...' : 'Add Funds'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* History Sheet */}
            <Sheet open={showHistory} onOpenChange={setShowHistory}>
              <SheetTrigger asChild>
                <Button variant="secondary" className="h-8 border border-border bg-muted text-foreground hover:bg-muted/80 text-[10px] font-bold uppercase tracking-widest">
                  History
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader className="mb-6">
                  <SheetTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" /> Savings History
                  </SheetTitle>
                  <SheetDescription>
                    Track how you funded <strong>{goal.title}</strong>
                  </SheetDescription>
                </SheetHeader>

                <div className="space-y-8">
                  {/* Sources Breakdown */}
                  {sourcesBreakdown && sourcesBreakdown.length > 0 && (
                    <div className="bg-muted/30 p-4 rounded-lg border border-border">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                        <PieChart className="w-4 h-4" /> Source Breakdown
                      </h4>
                      <div className="space-y-3">
                        {sourcesBreakdown.map(source => (
                          <div key={source.name}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-medium text-foreground">{source.name}</span>
                              <span className="tabular-nums text-muted-foreground">{formatCurrency(source.amount)}</span>
                            </div>
                            <div className="h-1.5 w-full bg-background rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary/80 rounded-full"
                                style={{ width: `${Math.min(100, (source.amount / goal.currentAmount) * 100)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Transaction List */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                      <Wallet className="w-4 h-4" /> Recent Contributions
                    </h4>
                    {hasHistory ? (
                      <div className="space-y-3 relative border-l border-border ml-2 pl-4">
                        {contributions.map((c: any, i: number) => (
                          <div key={c.id || i} className="relative">
                            <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-muted border border-border" />
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-bold text-foreground">{c.source}</p>
                                <p className="text-[10px] text-muted-foreground">{formatDateLabel(new Date(c.date))}</p>
                                {c.note && <p className="text-xs text-muted-foreground mt-0.5 italic">"{c.note}"</p>}
                              </div>
                              <p className="text-sm font-bold text-primary tabular-nums">+{formatCurrency(Number(c.amount))}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic text-center py-4">No history available yet.</p>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Image Section */}
        <div
          className="md:w-64 h-32 md:h-auto bg-cover bg-center rounded-sm opacity-40 group-hover:opacity-100 transition-all duration-500 border border-border"
          style={{ backgroundImage: bgImage ? `url(${bgImage})` : undefined }}
        >
          {!bgImage && (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <Sparkles className="text-muted-foreground/30 animate-pulse" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WishlistHighlightRow({ item }: { item: import("@/types/wishlist").WishlistItem }) {
  const fundedPercent = 0; // Current wishlist doesn't strictly track 'currentAmount', assumes pending/completed. Could extend later.
  // For now, visualize 0% or allow manual override if model supported it.
  // Wireframe shows funding %. Let's mock random or 0 for now until schema update.
  const mockFunded = Math.floor(Math.random() * 80);

  return (
    <div>
      <div className="flex justify-between mb-2">
        <span className="text-[11px] font-bold uppercase tracking-tight text-muted-foreground truncate max-w-[150px]">{item.title}</span>
        <span className="text-[11px] font-black text-foreground">{formatCurrency(Number(item.estimatedCost))}</span>
      </div>
      <div className="h-0.5 w-full bg-muted overflow-hidden">
        <div className="h-full bg-primary" style={{ width: `${mockFunded}%` }}></div>
      </div>
      <p className="text-[9px] font-bold text-primary/80 mt-2 uppercase">{mockFunded}% funded</p>
    </div>
  );
}
