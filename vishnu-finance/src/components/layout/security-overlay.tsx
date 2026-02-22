'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface SecurityOverlayProps {
    isVisible: boolean;
}

export function SecurityOverlay({ isVisible }: SecurityOverlayProps) {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-3xl overflow-hidden touch-none select-none pointer-events-auto"
                >
                    <div className="flex flex-col items-center gap-4 text-center p-8">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                            <svg
                                className="w-8 h-8 text-primary"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002-2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold">Secure Vault Active</h2>
                        <p className="text-sm text-muted-foreground max-w-[200px]">
                            Content hidden for your privacy and security.
                        </p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
