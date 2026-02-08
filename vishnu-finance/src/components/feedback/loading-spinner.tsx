'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    text?: string;
}

export default function LoadingSpinner({
    size = 'md',
    className = '',
    text
}: LoadingSpinnerProps) {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
        xl: 'w-16 h-16',
    };

    return (
        <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
            <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
            {text && <p className="text-sm font-medium text-muted-foreground animate-pulse">{text}</p>}
        </div>
    );
}
