'use client';

import React, { useEffect, useState } from 'react';
import { Quote } from 'lucide-react';

interface DailyQuote {
    text: string;
    author?: string;
}

export function DailyQuoteCard() {
    const [quote, setQuote] = useState<DailyQuote | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchQuote = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/daily-quote');
            const data = await response.json();
            setQuote(data);
        } catch (error) {
            console.error('Failed to fetch quote:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuote();
    }, []);

    if (loading) {
        return (
            <div className="bg-card/40 border border-border/40 rounded-2xl p-6 h-full flex flex-col justify-center animate-pulse">
                <div className="h-4 bg-muted/20 w-3/4 mb-3 rounded" />
                <div className="h-3 bg-muted/20 w-1/2 rounded" />
            </div>
        );
    }

    if (!quote) return null;

    return (
        <div className="bg-card/40 border border-border/40 backdrop-blur-md rounded-2xl p-6 h-full flex flex-col justify-center relative overflow-hidden group hover:border-border/60 transition-colors">
            <Quote className="absolute top-4 right-4 w-8 h-8 text-foreground/5 opacity-50" />
            <div className="relative z-10">
                <p className="text-lg md:text-xl font-display font-medium text-foreground leading-relaxed italic mb-3 opacity-90">
                    "{quote.text}"
                </p>
                {quote.author && (
                    <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold pl-1 border-l-2 border-primary/30">
                        {quote.author}
                    </p>
                )}
            </div>
        </div>
    );
}
