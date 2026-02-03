'use client';

import React, { useState } from 'react';
import { Calendar } from 'lucide-react';

interface BriefingImageProps {
    src: string | null;
    title: string;
    sentimentColor?: string;
    sentiment?: string;
    score?: number;
}

export default function BriefingImage({ src, title, sentimentColor, sentiment, score }: BriefingImageProps) {
    const [error, setError] = useState(false);

    if (error || !src) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-900 to-black relative">
                <Calendar className="w-10 h-10 text-white/10" />
                {/* Badges Overlay */}
                {sentiment && (
                    <div className="absolute top-4 left-4">
                        <div className={`backdrop-blur-md border text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-sm ${sentimentColor}`}>
                            {sentiment}
                        </div>
                    </div>
                )}
                {score !== undefined && (
                    <div className="absolute top-4 right-4">
                        <span className="bg-background/50 backdrop-blur-md text-foreground border border-border text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-sm">
                            {score}/100
                        </span>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="relative w-full h-full">
            <img
                src={src}
                alt={title || 'Market Update'}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                onError={() => {
                    // Fallback to error state
                    setError(true);
                }}
            />
            {/* Floating Badge Overlay - Copied from Server Component logic to ensure it stays on top of image */}
            {sentiment && (
                <div className="absolute top-4 left-4">
                    <div className={`backdrop-blur-md border text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-sm ${sentimentColor}`}>
                        {sentiment}
                    </div>
                </div>
            )}
            {score !== undefined && (
                <div className="absolute top-4 right-4">
                    <span className="bg-background/50 backdrop-blur-md text-foreground border border-border text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-sm">
                        {score}/100
                    </span>
                </div>
            )}
        </div>
    );
}
