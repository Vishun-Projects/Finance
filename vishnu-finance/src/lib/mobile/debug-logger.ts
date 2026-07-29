'use client';

type LogType = 'log' | 'warn' | 'error' | 'network';

interface LogEntry {
    type: LogType;
    message: string;
    data?: any;
    timestamp: string;
    id: string;
}

function safeSerialize(arg: unknown): string {
    try {
        if (arg instanceof Error) {
            return arg.stack || arg.message || String(arg);
        }
        if (typeof arg === 'object' && arg !== null) {
            return JSON.stringify(arg, (_key, value) => {
                if (typeof value === 'bigint') return String(value);
                if (typeof value === 'function') return `[Function ${value.name || 'anonymous'}]`;
                return value;
            });
        }
        return String(arg);
    } catch {
        try {
            return Object.prototype.toString.call(arg);
        } catch {
            return '[Unserializable]';
        }
    }
}

class DebugLogger {
    private logs: LogEntry[] = [];
    private listeners: ((logs: LogEntry[]) => void)[] = [];
    private maxLogs = 200;
    private isInitialized = false;

    init() {
        if (typeof window === 'undefined' || this.isInitialized) return;

        // Avoid monkey-patching console in production — circular React/Capacitor
        // objects in console.error can throw via JSON.stringify and crash the app.
        if (process.env.NODE_ENV === 'production') {
            this.isInitialized = true;
            return;
        }

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
    }

    private addEntry(type: LogType, args: any[]) {
        try {
            const message = args.map(safeSerialize).join(' ');

            const entry: LogEntry = {
                id: Math.random().toString(36).substring(7),
                type,
                message,
                data: args.length > 1 ? args.slice(1) : undefined,
                timestamp: new Date().toLocaleTimeString(),
            };

            this.logs = [entry, ...this.logs].slice(0, this.maxLogs);
            this.notify();
        } catch {
            // Never let logging crash the app
        }
    }

    logNetwork(method: string, url: string, status?: number, error?: string, body?: any) {
        if (process.env.NODE_ENV === 'production') return;

        try {
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
        } catch {
            // ignore
        }
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
