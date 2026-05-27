'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { generateBriefingAction } from '@/app/actions/briefing-actions';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Skeleton } from "@/components/ui/skeleton";

export default function BriefingGenerator({ date }: { date: string }) {
    const router = useRouter();
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);

        try {
            const result = await generateBriefingAction(date);
            if (result.success) {
                router.refresh(); // Reload to show the new content
            } else {
                setError(result.error || "Generation failed.");
                setIsGenerating(false);
            }
        } catch (e) {
            setError("An unexpected error occurred.");
            setIsGenerating(false);
        }
    };

    const isFuture = new Date(date) > new Date();

    return (
        <div className="flex flex-col h-full items-center justify-center p-8 text-center space-y-8 animate-in fade-in zoom-in duration-500 w-full max-w-3xl mx-auto">

            {isGenerating ? (
                /* LOADING SKELETON STATE */
                <div className="w-full space-y-8">
                    {/* Simulating Hero Image */}
                    <div className="relative w-full aspect-[3/1] rounded-xl overflow-hidden">
                        <Skeleton className="absolute inset-0 w-full h-full" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-bold uppercase tracking-widest opacity-50 text-muted-foreground animate-pulse">
                                AI Analyst Generating Briefing...
                            </span>
                        </div>
                    </div>

                    {/* Simulating Title & Meta */}
                    <div className="max-w-xl mx-auto space-y-4">
                        <div className="flex justify-center gap-2">
                            <Skeleton className="h-4 w-20 rounded-full" />
                            <Skeleton className="h-4 w-20 rounded-full" />
                        </div>
                        <Skeleton className="h-10 w-3/4 mx-auto rounded-lg" />
                        <Skeleton className="h-4 w-1/3 mx-auto rounded-lg opacity-50" />
                    </div>

                    {/* Simulating Content Body */}
                    <div className="space-y-4 pt-4 max-w-2xl mx-auto">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-[90%]" />
                        <Skeleton className="h-4 w-[95%]" />
                        <Skeleton className="h-32 w-full rounded-xl mt-4" /> {/* Key Takeaways Box */}
                    </div>
                </div>
            ) : (
                /* ORIGINAL EMPTY STATE */
                <>
                    <div className="relative">
                        <div className="w-32 h-32 rounded-full bg-muted/50 flex items-center justify-center border border-border">
                            <Calendar className="w-12 h-12 text-muted-foreground" />
                        </div>
                    </div>

                    <div className="space-y-4 max-w-md">
                        <h1 className="text-3xl font-bold font-display text-foreground">
                            {isFuture ? "Future Date Selected" : "No Briefing Found"}
                        </h1>

                        <p className="text-muted-foreground leading-relaxed">
                            {isFuture ? (
                                <>
                                    We cannot predict the future (yet). Market data for <span className="font-bold text-foreground">{date}</span> is not available.
                                </>
                            ) : (
                                <>
                                    We haven't generated a market report for <span className="font-bold text-foreground">{date}</span> yet. Would you like to generate it now?
                                </>
                            )
                            }
                        </p>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm flex items-center justify-center gap-2">
                                <AlertCircle className="w-4 h-4" /> {error}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <Link
                            href="/education/daily-news/history"
                            className="px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Return to Archive
                        </Link>

                        {!isFuture && (
                            <Button
                                onClick={handleGenerate}
                                className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-6 rounded-full font-bold uppercase tracking-widest shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
                            >
                                <Sparkles className="w-4 h-4 mr-2" />
                                Generate Report
                            </Button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
