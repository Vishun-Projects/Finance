import { prisma } from '@/lib/db';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';
import BriefingImage from '@/components/BriefingImage';
import HistoryCalendar from '@/components/HistoryCalendar';

export default async function DailyBriefingHistoryPage() {
    const briefings = await prisma.dailyBriefing.findMany({
        orderBy: {
            date: 'desc'
        }
    });

    // Fetch just the dates for the calendar to avoid loading heavy content
    const allDates = await prisma.dailyBriefing.findMany({
        select: { date: true },
        orderBy: { date: 'desc' }
    });

    const availableDates = allDates.map(b => b.date.toISOString());

    return (
        <div className="flex flex-col h-full bg-background text-muted-foreground selection:bg-primary/30 selection:text-white overflow-y-auto custom-scrollbar">
            {/* Header - Desktop Only */}
            <div className="hidden lg:flex h-16 border-b border-border items-center justify-between px-8 shrink-0 bg-background/50 backdrop-blur sticky top-0 z-30">
                <div className="flex items-center gap-2">
                    <Link href="/education" className="flex items-center gap-2 hover:text-foreground transition-colors group">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground group-hover:text-primary transition-colors">Back to Hub</h2>
                    </Link>
                </div>
            </div>

            <main className="p-4 pt-20 lg:p-8 space-y-8 max-w-7xl mx-auto w-full pb-24">
                {/* Mobile Back Link */}
                <div className="lg:hidden mb-4">
                    <Link href="/education" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/50 border border-border text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="w-3 h-3" /> Back to Hub
                    </Link>
                </div>

                <div className="flex flex-col gap-2 mb-8">
                    <div className="flex items-center gap-2 text-primary">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Market Archives</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight text-foreground leading-[0.9] font-display">
                        DAILY <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/50 italic pr-2">BRIEFINGS</span>
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium leading-relaxed max-w-xl border-l-2 border-primary/30 pl-4 mt-2">
                        A chronological record of AI-generated market intelligence. Track the pulse of the economy day by day.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Main Timeline Grid */}
                    <div className="lg:col-span-3 relative pl-6 lg:pl-10 border-l border-border/40 space-y-6 lg:space-y-8 ml-2 lg:ml-0">
                        {briefings.length === 0 && ( /* Empty State */
                            <div className="text-center py-20 opacity-50 glass-card rounded-3xl border-dashed">
                                <Minus className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                                <h3 className="text-sm font-bold uppercase tracking-widest">No Archives Found</h3>
                            </div>
                        )}

                        {briefings.map((briefing) => {
                            const dateStr = new Date(briefing.date).toLocaleDateString("en-CA");
                            const sentimentColor =
                                briefing.sentiment === 'Bullish' ? 'text-green-500 border-green-500/20 bg-green-500/5' :
                                    briefing.sentiment === 'Bearish' ? 'text-red-500 border-red-500/20 bg-red-500/5' :
                                        'text-yellow-500 border-yellow-500/20 bg-yellow-500/5';

                            const sentimentBorder =
                                briefing.sentiment === 'Bullish' ? 'border-l-green-500/50' :
                                    briefing.sentiment === 'Bearish' ? 'border-l-red-500/50' :
                                        'border-l-yellow-500/50';

                            return (
                                <div key={briefing.id} className="relative group">
                                    {/* Timeline Dot */}
                                    <div className="absolute -left-[31px] lg:-left-[47px] top-6 lg:top-8 w-3 h-3 lg:w-4 lg:h-4 rounded-full border-2 lg:border-4 border-background bg-muted-foreground/30 group-hover:bg-primary group-hover:scale-125 transition-all duration-300 z-10 shadow-sm"></div>

                                    <Link
                                        href={`/education/daily-news/${dateStr}`}
                                        className={`block relative overflow-hidden rounded-2xl md:rounded-3xl glass-card border-none bg-card/40 hover:bg-card/60 transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-primary/5 group-hover:scale-[1.01] border-l-4 ${sentimentBorder}`}
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-5 h-full">
                                            {/* Left: Image (Col 2) */}
                                            <div className="md:col-span-2 h-40 md:h-auto relative overflow-hidden">
                                                <BriefingImage
                                                    src={briefing.heroImage}
                                                    title={briefing.title || 'Market Briefing'}
                                                    sentiment={briefing.sentiment}
                                                    sentimentColor={sentimentColor}
                                                    score={briefing.sentimentScore}
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-card/40"></div>

                                                {/* Mobile Date Badge overlay */}
                                                <div className="absolute top-3 left-3 md:hidden">
                                                    <span className="bg-background/80 backdrop-blur-md text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md border border-white/10 shadow-sm">
                                                        {new Date(briefing.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Right: Content (Col 3) */}
                                            <div className="md:col-span-3 p-5 md:p-6 flex flex-col justify-center relative z-20 -mt-10 md:mt-0">
                                                <div className="flex items-center gap-2 mb-2 md:mb-3">
                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border backdrop-blur-sm ${sentimentColor} uppercase tracking-widest`}>
                                                        {briefing.sentiment}
                                                    </span>
                                                    <span className="hidden md:inline text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
                                                        {new Date(briefing.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                                                    </span>
                                                </div>

                                                <h3 className="text-lg md:text-xl font-bold text-foreground mb-2 leading-tight group-hover:text-primary transition-colors font-display line-clamp-2">
                                                    {briefing.title}
                                                </h3>

                                                <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2 mb-4 font-medium opacity-80">
                                                    {(briefing.summary as string[])?.[0] || 'Market analysis and key takeaways...'}
                                                </p>

                                                <div className="flex items-center text-primary text-[10px] font-black uppercase tracking-widest group-hover:gap-2 transition-all">
                                                    Read Analysis <ArrowRight className="w-3 h-3 ml-1" />
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </div>
                            );
                        })}
                    </div>

                    {/* Sidebar Calendar */}
                    <div className="hidden lg:block lg:col-span-1 h-full sticky top-24">
                        <HistoryCalendar availableDates={availableDates} />
                    </div>
                </div>
            </main>
        </div>
    );
}
