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
        <div className="flex flex-col h-full bg-background text-muted-foreground font-sans selection:bg-primary/30 selection:text-white overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="h-16 border-b border-border flex items-center justify-between px-8 shrink-0 bg-background/50 backdrop-blur sticky top-0 z-30">
                <div className="flex items-center gap-2">
                    <Link href="/education" className="flex items-center gap-2 hover:text-foreground transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors">Back to Hub</h2>
                    </Link>
                </div>
            </div>

            <main className="p-8 space-y-8 max-w-7xl mx-auto w-full pb-24">
                <div className="flex flex-col gap-2 mb-8">
                    <div className="flex items-center gap-2 text-primary">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Market Archives</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground leading-tight font-display">
                        DAILY <span className="text-primary italic">BRIEFINGS</span>
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium leading-relaxed max-w-xl">
                        A chronological record of AI-generated market intelligence. Track the pulse of the economy day by day.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Main Timeline Grid */}
                    <div className="lg:col-span-3 relative pl-8 border-l border-border/40 space-y-8">
                        {briefings.length === 0 && ( /* Empty State */
                            <div className="text-center py-20 opacity-50">
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

                            return (
                                <div key={briefing.id} className="relative group">
                                    {/* Timeline Dot */}
                                    <div className="absolute -left-[37px] top-8 w-4 h-4 rounded-full border-4 border-background bg-muted-foreground/20 group-hover:bg-primary group-hover:scale-125 transition-all duration-300 z-10"></div>

                                    <Link
                                        href={`/education/daily-news/${dateStr}`}
                                        className="block relative overflow-hidden rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm hover:bg-card/80 hover:border-primary/30 transition-all duration-500 group-hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-5 h-full">
                                            {/* Left: Image (Col 2) */}
                                            <div className="md:col-span-2 h-48 md:h-auto relative overflow-hidden">
                                                <BriefingImage
                                                    src={briefing.heroImage}
                                                    title={briefing.title}
                                                    sentiment={briefing.sentiment}
                                                    sentimentColor={sentimentColor}
                                                    score={briefing.sentimentScore}
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-card/40 md:to-transparent"></div>
                                            </div>

                                            {/* Right: Content (Col 3) */}
                                            <div className="md:col-span-3 p-6 flex flex-col justify-center">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${sentimentColor} uppercase tracking-wider`}>
                                                        {briefing.sentiment}
                                                    </span>
                                                    <span className="text-muted-foreground text-[10px] uppercase tracking-wider">
                                                        {new Date(briefing.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                                                    </span>
                                                </div>

                                                <h3 className="text-xl font-bold text-foreground mb-3 leading-tight group-hover:text-primary transition-colors font-display line-clamp-2">
                                                    {briefing.title}
                                                </h3>

                                                <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 mb-6 font-sans opacity-80">
                                                    {(briefing.summary as string[])?.[0] || 'Market analysis and key takeaways...'}
                                                </p>

                                                <div className="flex items-center text-primary text-xs font-bold uppercase tracking-widest group-hover:gap-2 transition-all">
                                                    Read Full Briefing <ArrowRight className="w-3 h-3 ml-1" />
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </div>
                            );
                        })}
                    </div>

                    {/* Sidebar Calendar */}
                    <div className="hidden lg:block lg:col-span-1 h-full">
                        <HistoryCalendar availableDates={availableDates} />
                    </div>
                </div>
            </main>
        </div>
    );
}
