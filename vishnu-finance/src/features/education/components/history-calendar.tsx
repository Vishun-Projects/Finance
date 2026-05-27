'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, isSameDay, parseISO } from 'date-fns';

interface HistoryCalendarProps {
    availableDates: string[]; // ISO date strings
}

export default function HistoryCalendar({ availableDates }: HistoryCalendarProps) {
    const router = useRouter();
    const dates = availableDates.map(d => parseISO(d));

    // Function to check if a date has a briefing
    const hasBriefing = (date: Date) => {
        return dates.some(d => isSameDay(d, date));
    };

    const handleSelect = (date: Date | undefined) => {
        if (!date) return;
        const dateStr = format(date, 'yyyy-MM-dd');
        router.push(`/education/daily-news/${dateStr}`);
    };

    return (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm sticky top-24">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                    Archive Calendar
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Calendar
                    mode="single"
                    selected={new Date()} // Highlight today by default or leave empty
                    onSelect={handleSelect}
                    modifiers={{
                        hasData: (date) => hasBriefing(date)
                    }}
                    modifiersClassNames={{
                        hasData: "bg-primary/20 font-bold text-primary hover:bg-primary/30"
                    }}
                    className="rounded-md border border-border/50 pointer-events-auto"
                />
                <div className="mt-4 flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-primary/20 border border-primary/50"></span>
                    Available Briefings
                </div>
            </CardContent>
        </Card>
    );
}
