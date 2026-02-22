'use client';
import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface MobileMenuProps {
    open: boolean;
    children: React.ReactNode;
    className?: string;
}

export function MobileMenu({ open, children, className }: MobileMenuProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return (
        <div
            className={cn(
                "absolute left-0 top-[100%] w-full origin-top transition-all duration-300 ease-out md:hidden",
                open ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0"
            )}
        >
            <div className={cn("flex flex-col", className)}>{children}</div>
        </div>
    );
}

type MenuToggleProps = React.ComponentProps<'svg'> & {
    open: boolean;
    duration?: number;
};

export function MenuToggleIcon({
    open,
    className,
    fill = 'none',
    stroke = 'currentColor',
    strokeWidth = 2.5,
    strokeLinecap = 'round',
    strokeLinejoin = 'round',
    duration = 500,
    ...props
}: MenuToggleProps) {
    return (
        <svg
            strokeWidth={strokeWidth}
            fill={fill}
            stroke={stroke}
            viewBox="0 0 32 32"
            strokeLinecap={strokeLinecap}
            strokeLinejoin={strokeLinejoin}
            className={cn(
                'transition-transform ease-in-out',
                open && '-rotate-45',
                className,
            )}
            style={{
                transitionDuration: `${duration}ms`,
            }}
            {...props}
        >
            <path
                className={cn(
                    'transition-all ease-in-out',
                    open
                        ? '[stroke-dasharray:20_300] [stroke-dashoffset:-32.42px]'
                        : '[stroke-dasharray:12_63]',
                )}
                style={{
                    transitionDuration: `${duration}ms`,
                }}
                d="M27 10 13 10C10.8 10 9 8.2 9 6 9 3.5 10.8 2 13 2 15.2 2 17 3.8 17 6L17 26C17 28.2 18.8 30 21 30 23.2 30 25 28.2 25 26 25 23.8 23.2 22 21 22L7 22"
            />
            <path d="M7 16 27 16" />
        </svg>
    );
}
