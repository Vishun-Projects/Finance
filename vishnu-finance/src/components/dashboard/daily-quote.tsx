'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Quote, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

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
            <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/10">
                <CardContent className="p-6">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                </CardContent>
            </Card>
        );
    }

    if (!quote) return null;

    return (
        <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/10 overflow-hidden group">
            <CardContent className="p-6 relative">
                <Quote className="absolute -top-2 -left-2 w-12 h-12 text-primary/5 group-hover:text-primary/10 transition-colors" />
                <div className="relative">
                    <p className="text-lg font-medium italic text-foreground/90 leading-relaxed mb-4">
                        "{quote.text}"
                    </p>
                    {quote.author && (
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-primary">
                                — {quote.author}
                            </p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
