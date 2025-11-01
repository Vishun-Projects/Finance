// Currency rates cache management (separated from API route due to Next.js export restrictions)

// Cache for exchange rates to avoid hitting external API too frequently
let cachedRates: { [key: string]: number } = {};
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // 1 minute

// Export function to clear currency rates cache
export function clearCurrencyRatesCache(): void {
  cachedRates = {};
  lastFetchTime = 0;
  console.log('✅ Currency rates cache cleared');
}

// Export function to get currency cache stats
export function getCurrencyCacheStats(): { hasCache: boolean; lastFetchTime: string | null } {
  return {
    hasCache: Object.keys(cachedRates).length > 0,
    lastFetchTime: lastFetchTime ? new Date(lastFetchTime).toISOString() : null
  };
}

// Function to get cached rates
export function getCachedRates(): { [key: string]: number } {
  return cachedRates;
}

// Function to set cached rates
export function setCachedRates(rates: { [key: string]: number }, timestamp: number): void {
  cachedRates = rates;
  lastFetchTime = timestamp;
}

// Function to check if cache is valid
export function isCacheValid(): boolean {
  const now = Date.now();
  return now - lastFetchTime < CACHE_DURATION && Object.keys(cachedRates).length > 0;
}

