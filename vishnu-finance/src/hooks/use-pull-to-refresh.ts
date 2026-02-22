'use client';

import { useEffect, useState } from 'react';

/**
 * Custom hook to implement pull-to-refresh logic
 * @param onRefresh Callback function to execute when pulled
 * @param threshold Displacement threshold to trigger refresh (default 100px)
 */
export function usePullToRefresh(onRefresh: () => Promise<void>, threshold: number = 100) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [startY, setStartY] = useState(0);
    const [currentY, setCurrentY] = useState(0);

    useEffect(() => {
        const handleTouchStart = (e: TouchEvent) => {
            if (window.scrollY === 0) {
                setStartY(e.touches[0].pageY);
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (startY > 0) {
                const pullDistance = e.touches[0].pageY - startY;
                if (pullDistance > 0) {
                    // Prevent default scroll if pulling down at top
                    if (window.scrollY === 0) {
                        setCurrentY(pullDistance);
                        // Apply slight resistance
                        const resistance = 1 - Math.min(pullDistance / 500, 0.5);
                        // We could apply visual feedback here if needed
                    }
                }
            }
        };

        const handleTouchEnd = async () => {
            if (startY > 0 && currentY >= threshold && !isRefreshing) {
                setIsRefreshing(true);
                try {
                    await onRefresh();
                } finally {
                    setIsRefreshing(false);
                }
            }
            setStartY(0);
            setCurrentY(0);
        };

        window.addEventListener('touchstart', handleTouchStart);
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd);

        return () => {
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [startY, currentY, isRefreshing, onRefresh, threshold]);

    return { isRefreshing, pullDistance: currentY };
}
