/**
 * AI OPTIMIZATION: Singleton Cache that survives HMR reloads in development
 * Uses globalThis to persist data across module re-evaluations.
 */
class GlobalCache {
    private static getStore(): Map<string, { data: any; expires: number }> {
        const globalAny = globalThis as any;
        if (!globalAny._financeGlobalCache) {
            globalAny._financeGlobalCache = new Map<string, { data: any; expires: number }>();
        }
        return globalAny._financeGlobalCache;
    }

    static get<T = any>(key: string): T | null {
        const store = this.getStore();
        const entry = store.get(key);
        if (entry && entry.expires > Date.now()) {
            return entry.data as T;
        }
        if (entry) store.delete(key);
        return null;
    }

    static set(key: string, data: any, ttlMs: number = 300000): void {
        this.getStore().set(key, {
            data,
            expires: Date.now() + ttlMs,
        });
    }

    static delete(key: string): void {
        this.getStore().delete(key);
    }

    static clear(): void {
        this.getStore().clear();
    }
}

export const globalCache = GlobalCache;
