'use client';

type LogType = 'log' | 'warn' | 'error' | 'network';

interface LogEntry {
    type: LogType;
    message: string;
    data?: any;
    timestamp: string;
    id: string;
}

class DebugLogger {
    private logs: LogEntry[] = [];
    private listeners: ((logs: LogEntry[]) => void)[] = [];
    private maxLogs = 200;
    private isInitialized = false;

    init() {
        if (typeof window === 'undefined' || this.isInitialized) return;

        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;

        console.log = (...args: any[]) => {
            this.addEntry('log', args);
            originalLog.apply(console, args);
        };

        console.warn = (...args: any[]) => {
            this.addEntry('warn', args);
            originalWarn.apply(console, args);
        };

        console.error = (...args: any[]) => {
            this.addEntry('error', args);
            originalError.apply(console, args);
        };

        this.isInitialized = true;
        console.log('🚀 DebugLogger initialized');
    }

    private addEntry(type: LogType, args: any[]) {
        const message = args
            .map(arg => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
            .join(' ');

        const entry: LogEntry = {
            id: Math.random().toString(36).substring(7),
            type,
            message,
            data: args.length > 1 ? args.slice(1) : undefined,
            timestamp: new Date().toLocaleTimeString(),
        };

        this.logs = [entry, ...this.logs].slice(0, this.maxLogs);
        this.notify();
    }

    logNetwork(method: string, url: string, status?: number, error?: string, body?: any) {
        const message = `[NETWORK] ${method} ${url} ${status || (error ? 'FAILED' : 'PENDING')}`;
        const entry: LogEntry = {
            id: Math.random().toString(36).substring(7),
            type: 'network',
            message,
            data: { status, error, body },
            timestamp: new Date().toLocaleTimeString(),
        };

        this.logs = [entry, ...this.logs].slice(0, this.maxLogs);
        this.notify();
    }

    subscribe(listener: (logs: LogEntry[]) => void) {
        this.listeners.push(listener);
        listener(this.logs);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notify() {
        this.listeners.forEach(l => l(this.logs));
    }

    getLogs() {
        return this.logs;
    }

    clear() {
        this.logs = [];
        this.notify();
    }
}

export const debugLogger = new DebugLogger();
