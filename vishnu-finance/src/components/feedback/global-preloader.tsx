'use client';

import React from 'react';
import { useLoading } from '@/contexts/LoadingContext';
import { useEffect, useState } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from 'framer-motion';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { cn } from '@/lib/utils';

interface GlobalPreloaderProps {
  loadingMessage?: string;
}

export default function GlobalPreloader({ loadingMessage = "Initializing systems..." }: GlobalPreloaderProps) {
  const { isLoading, loadingMessage: contextLoadingMessage } = useLoading(); // Use contextLoadingMessage for the actual loading state
  const [showIntro, setShowIntro] = useState(false);
  const [engineStarted, setEngineStarted] = useState(false);

  const currentLoadingMessage = loadingMessage || contextLoadingMessage; // Prioritize prop, then context

  useEffect(() => {
    if (currentLoadingMessage === "Engine starting..." && Capacitor.isNativePlatform()) {
      Haptics.impact({ style: ImpactStyle.Heavy });
      setEngineStarted(true);
      // Keep it visible for a moment even if isLoading turns false
      setShowIntro(true);
      setTimeout(() => setShowIntro(false), 3000);
    }
  }, [currentLoadingMessage]);

  if (!isLoading && !showIntro) return null; // Only hide if not loading and intro is not active

  return (
    <AnimatePresence>
      {(isLoading || showIntro) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background/95 backdrop-blur-md z-[100] flex items-center justify-center"
        >
          <div className="flex flex-col items-center space-y-8 max-w-sm w-full p-8">
            {/* Animated Core Logo Container */}
            <motion.div
              animate={engineStarted ? {
                scale: [1, 1.2, 1],
                rotate: [0, 360],
              } : {}}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-background border border-primary/30 flex items-center justify-center shadow-lg icon-glow relative z-10">
                <div className={cn(
                  "w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin",
                  engineStarted && "border-green-500 animate-none scale-110 transition-all"
                )} />
              </div>
              <div className="absolute inset-0 bg-primary/20 blur-2xl animate-pulse -z-10" />
            </motion.div>

            <div className="space-y-4 w-full flex flex-col items-center">
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-center"
              >
                <h2 className="text-xl font-bold tracking-tight text-foreground mb-1">
                  {engineStarted ? "Welcome Back" : "Vishnu Finance"}
                </h2>
                <div className="flex items-center justify-center gap-2">
                  {!engineStarted && <div className="h-1 w-1 rounded-full bg-primary animate-ping" />}
                  <p className={cn(
                    "text-xs font-semibold tracking-[0.2em] uppercase",
                    engineStarted ? "text-green-500 font-bold" : "text-muted-foreground"
                  )}>
                    {engineStarted ? "System Ready" : currentLoadingMessage}
                  </p>
                </div>
              </motion.div>

              {/* Loading Progress Bar */}
              {!engineStarted && (
                <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="w-full h-full bg-primary"
                  />
                </div>
              )}
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-[10px] text-muted-foreground/50 uppercase tracking-widest absolute bottom-12"
            >
              {engineStarted ? "Biometric Secure Session Active" : "Secured by Vishnu Finance Core v1.2"}
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
