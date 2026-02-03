import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, TrendingUp, TrendingDown, Minus, Share2, Sparkles, Calendar } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { BriefingService } from '@/services/briefing-service';
import BriefingGenerator from '@/components/BriefingGenerator';

// Helper to parse "YYYY-MM-DD" to Date start/end 
function getDateRange(dateStr: string) {
    const target = new Date(dateStr);
    const start = new Date(target);
    start.setHours(0, 0, 0, 0);

    const end = new Date(target);
    end.setHours(23, 59, 59, 999);

    return { start, end };
}

export default async function DailyBriefingPage({ params }: { params: Promise<{ date: string }> }) {
    const { date } = await params;
    const { start } = getDateRange(date); // We just need the date object

    if (isNaN(start.getTime())) {
        return notFound();
    }

    // Check DB Only (No auto-generation)
    const briefing = await BriefingService.get(start);

    if (!briefing) {
        return <BriefingGenerator date={date} />;
    }

    const sentimentColor =
        briefing.sentiment === 'Bullish' ? 'text-green-500 bg-green-500/10' :
            briefing.sentiment === 'Bearish' ? 'text-red-500 bg-red-500/10' :
                briefing.sentiment === 'Volatile' ? 'text-yellow-500 bg-yellow-500/10' :
                    'text-blue-500 bg-blue-500/10';

    const SentimentIcon =
        briefing.sentiment === 'Bullish' ? TrendingUp :
            briefing.sentiment === 'Bearish' ? TrendingDown :
                briefing.sentiment === 'Volatile' ? TrendingUp :
                    Minus;

    return (
        <div className="flex flex-col h-full bg-background text-muted-foreground font-display selection:bg-primary/30 selection:text-white overflow-y-auto custom-scrollbar">

            {/* Main Content Area */}
            <main className="flex-1 relative">
                {/* Top App Bar (Floating) */}
                <div className="sticky top-0 z-40 flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border">
                    <div className="flex items-center gap-4">
                        <Link href="/education/daily-news/history" className="text-muted-foreground hover:text-foreground">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <span className="text-muted-foreground font-sans text-[10px] uppercase tracking-[0.2em]">Daily Briefing</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-accent/50 rounded-full border border-border">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-foreground">Live Market</span>
                        </div>
                        <button className="text-muted-foreground hover:text-foreground transition-colors"><Share2 className="w-4 h-4" /></button>
                        <button className="px-4 py-1.5 rounded text-[10px] font-sans font-bold uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 transition-all">
                            Save for Later
                        </button>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto px-6 pb-24">
                    {/* Header Image Banner */}
                    <div className="relative mt-6 mb-8 rounded-xl overflow-hidden w-full aspect-[3/1] shadow-lg bg-muted group">
                        {briefing.heroImage ? (
                            <Image
                                src={briefing.heroImage}
                                alt={briefing.title}
                                fill
                                className="object-cover transition-transform duration-1000 group-hover:scale-105"
                                priority
                            />
                        ) : (
                            <div className="absolute inset-0 bg-muted flex items-center justify-center">
                                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#444_1px,transparent_1px)] [background-size:16px_16px]"></div>
                                <div className="flex flex-col items-center gap-2 opacity-50">
                                    <span className="text-[10px] font-sans uppercase tracking-widest">No Banner Image</span>
                                </div>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-background/10 to-transparent"></div>
                    </div>

                    {/* Title Section */}
                    <div className="mb-12 text-center max-w-2xl mx-auto">
                        <div className="flex items-center justify-center gap-2 mb-4">
                            <span className={`px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 border ${sentimentColor} bg-background`}>
                                <SentimentIcon className="w-3 h-3" />
                                {briefing.sentiment}
                            </span>
                            <span className="text-muted-foreground text-[10px] uppercase tracking-widest">•</span>
                            <span className="text-muted-foreground text-[10px] uppercase tracking-widest">Risk Score: {briefing.sentimentScore}/100</span>
                        </div>

                        <h1 className="text-foreground text-4xl md:text-5xl font-bold leading-tight mb-6 font-display">
                            {briefing.title}
                        </h1>

                        <div className="flex items-center justify-center gap-6 text-muted-foreground font-sans text-[11px] uppercase tracking-wider">
                            <span className="flex items-center gap-1.5 opacity-70">
                                <TrendingUp className="w-3.5 h-3.5" /> AI Analyst
                            </span>
                            <span className="flex items-center gap-1.5 opacity-70">
                                {new Date(briefing.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                        </div>
                    </div>

                    {/* Article Content */}
                    <div className="space-y-8">
                        {/* Executive Summary (Key Takeaways) */}
                        <div className="bg-accent/30 border-l-2 border-primary p-6 rounded-r-xl my-8">
                            <h3 className="text-primary text-[10px] font-bold uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <Sparkles className="w-3 h-3" /> Key Takeaways
                            </h3>
                            <ul className="space-y-3">
                                {(briefing.summary as string[])?.map((point, i) => (
                                    <li key={i} className="flex gap-3 text-lg font-display text-muted-foreground/90 italic">
                                        <span className="text-primary font-bold text-sm mt-1.5">•</span>
                                        {point}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Main Markdown Content */}
                        <div className="education-content font-display text-lg leading-loose text-muted-foreground/90 space-y-6">
                            {briefing.content ? (
                                <ReactMarkdown
                                    components={{
                                        h1: ({ ...props }) => <h2 className="text-foreground text-2xl font-bold mt-12 mb-6 font-sans border-b border-border pb-4" {...props} />,
                                        h2: ({ ...props }) => <h2 className="text-foreground text-2xl font-bold mt-12 mb-4 font-sans pl-4 border-l-2 border-primary" {...props} />,
                                        h3: ({ ...props }) => <h3 className="text-foreground text-xl font-semibold mt-8 mb-3" {...props} />,
                                        p: ({ ...props }) => <p className="mb-6 leading-8" {...props} />,
                                        ul: ({ ...props }) => <ul className="space-y-3 pl-2 my-6" {...props} />,
                                        li: ({ ...props }) => (
                                            <li className="flex items-start gap-3">
                                                <span className="text-primary font-bold mt-1.5">•</span>
                                                <span className="flex-1" {...props} />
                                            </li>
                                        ),
                                        strong: ({ ...props }) => <strong className="text-foreground font-semibold" {...props} />,
                                        a: ({ ...props }) => <a className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary transition-all" {...props} />,
                                        blockquote: ({ ...props }) => (
                                            <div className="bg-accent/50 border border-border p-6 rounded-xl my-10 relative overflow-hidden italic text-muted-foreground" {...props} />
                                        )
                                    }}
                                >
                                    {briefing.content}
                                </ReactMarkdown>
                            ) : (
                                <div className="p-12 text-center border rounded-xl border-dashed">
                                    <p className="italic text-muted-foreground">Full analysis content is not available for this date.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sources Footer */}
                    <div className="mt-20 pt-10 border-t border-border">
                        <h4 className="text-[10px] font-sans font-bold uppercase tracking-widest mb-6 text-muted-foreground text-center">Sources & References</h4>
                        <div className="flex flex-wrap justify-center gap-4">
                            {(briefing.sources as any[])?.map((source, i) => (
                                <a
                                    key={i}
                                    href={source.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-4 py-2 rounded-full border border-border/50 hover:bg-accent/50 hover:border-primary/30 transition-all group"
                                >
                                    <span className="text-xs font-medium group-hover:text-primary transition-colors max-w-[200px] truncate">{source.title}</span>
                                    <ExternalLink className="w-3 h-3 text-muted-foreground" />
                                </a>
                            ))}
                        </div>
                        <p className="mt-8 text-center text-muted-foreground font-sans text-[10px] uppercase tracking-tighter">
                            © {new Date().getFullYear()} Vishnu Finance • AI Generated Insight
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
