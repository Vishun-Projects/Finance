'use client';

import { useState, useEffect } from 'react';
import { debugLogger } from '@/lib/mobile/debug-logger';
import { Terminal, X, Trash2, Copy, Wifi, AlertTriangle, Bug } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function DebugOverlay() {
    const [isOpen, setIsOpen] = useState(false);
    const [logs, setLogs] = useState(debugLogger.getLogs());

    useEffect(() => {
        return debugLogger.subscribe(setLogs);
    }, []);

    const handleCopyLogs = () => {
        const logText = logs
            .map(l => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message} ${l.data ? JSON.stringify(l.data) : ''}`)
            .join('\n');

        navigator.clipboard.writeText(logText).then(() => {
            toast.success('Logs copied to clipboard');
        });
    };

    return (
        <>
            {/* Floating Toggle Button */}
            <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                onClick={() => setIsOpen(true)}
                className="fixed bottom-24 right-4 z-[9999] h-12 w-12 rounded-full bg-primary/80 backdrop-blur-md border border-primary-foreground/20 flex items-center justify-center shadow-xl text-primary-foreground"
            >
                <Bug size={24} />
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        className="fixed inset-0 z-[10000] bg-background/95 backdrop-blur-sm flex flex-col pt-safe"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <div className="flex items-center gap-2">
                                <Terminal size={20} className="text-primary" />
                                <h2 className="text-lg font-bold">Mobile Debug Console</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={handleCopyLogs} className="p-2 rounded-lg hover:bg-muted"><Copy size={18} /></button>
                                <button onClick={() => debugLogger.clear()} className="p-2 rounded-lg hover:bg-muted text-destructive"><Trash2 size={18} /></button>
                                <button onClick={() => setIsOpen(false)} className="p-2 rounded-lg hover:bg-muted"><X size={24} /></button>
                            </div>
                        </div>

                        {/* Log List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-[10px]">
                            {logs.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                                    <Bug size={48} className="mb-4 opacity-20" />
                                    <p>No logs captured yet.</p>
                                </div>
                            ) : (
                                logs.map(log => (
                                    <div key={log.id} className={`p-2 rounded-md border ${log.type === 'error' ? 'bg-destructive/10 border-destructive/30 text-destructive' :
                                            log.type === 'warn' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600' :
                                                log.type === 'network' ? 'bg-blue-500/10 border-blue-500/30 text-blue-600' :
                                                    'bg-muted/50 border-border text-foreground'
                                        }`}>
                                        <div className="flex justify-between mb-1 opacity-70">
                                            <span className="font-bold">{log.type.toUpperCase()}</span>
                                            <span>{log.timestamp}</span>
                                        </div>
                                        <div className="break-all whitespace-pre-wrap">{log.message}</div>
                                        {log.data && (
                                            <details className="mt-1">
                                                <summary className="cursor-pointer opacity-50 underline">Details</summary>
                                                <pre className="mt-1 overflow-x-auto p-1 bg-black/5 rounded text-[8px]">
                                                    {JSON.stringify(log.data, null, 2)}
                                                </pre>
                                            </details>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-4 border-t border-border bg-muted/30 text-[9px] text-muted-foreground italic">
                            Tap any "Details" to expand raw object/network data.
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
