import { NextRequest, NextResponse } from 'next/server';

// Cache for exchange rates to avoid hitting external API too frequently
let cachedRates: { [key: string]: number } = {};
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // 1 minute

export async function GET(request: NextRequest) {
  try {
    const now = Date.now();
    
    // Return cached rates if they're still fresh
    if (now - lastFetchTime < CACHE_DURATION && Object.keys(cachedRates).length > 0) {
      return NextResponse.json({
        rates: cachedRates,
        lastUpdated: new Date(lastFetchTime).toISOString(),
        source: 'cache'
      });
    }

    // Fetch fresh rates from multiple sources
    const rates = await fetchExchangeRates();
    
    if (Object.keys(rates).length === 0) {
      // If all sources fail, return cached rates or default rates
      if (Object.keys(cachedRates).length > 0) {
        return NextResponse.json({
          rates: cachedRates,
          lastUpdated: new Date(lastFetchTime).toISOString(),
          source: 'fallback_cache'
        });
      }
      
      // Return default rates if no cache available
      return NextResponse.json({
        rates: getDefaultRates(),
        lastUpdated: new Date().toISOString(),
        source: 'default'
      });
    }

    // Update cache
    cachedRates = rates;
    lastFetchTime = now;

    return NextResponse.json({
      rates,
      lastUpdated: new Date().toISOString(),
      source: 'api'
    });

  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    
    // Return cached rates or default rates on error
    if (Object.keys(cachedRates).length > 0) {
      return NextResponse.json({
        rates: cachedRates,
        lastUpdated: new Date(lastFetchTime).toISOString(),
        source: 'error_fallback'
      });
    }
    
    return NextResponse.json({
      rates: getDefaultRates(),
      lastUpdated: new Date().toISOString(),
      source: 'error_default'
    });
  }
}

async function fetchExchangeRates(): Promise<{ [key: string]: number }> {
  const rates: { [key: string]: number } = {};
  
  try {
    // Try multiple free exchange rate APIs
    const sources = [
      {
        url: 'https://api.exchangerate-api.com/v4/latest/USD',
        name: 'ExchangeRate-API',
        parser: (data: any) => data.rates
      },
      {
        url: 'https://api.fixer.io/v1/latest?access_key=eb72e039872a2f2007803ba9edb78f4a&base=USD',
        name: 'Fixer.io',
        parser: (data: any) => data.rates
      },
      {
        url: 'https://api.exchangerate.host/latest?base=USD',
        name: 'ExchangeRate-Host',
        parser: (data: any) => data.rates
      },
      {
        url: 'https://api.currencyapi.com/v3/latest?apikey=YOUR_API_KEY&base_currency=USD',
        name: 'CurrencyAPI',
        parser: (data: any) => data.data ? Object.fromEntries(Object.entries(data.data).map(([key, value]: [string, any]) => [key, value.value])) : {}
      }
    ];

    for (const source of sources) {
      try {
        console.log(`Trying ${source.name}...`);
        
        const response = await fetch(source.url, {
          headers: {
            'User-Agent': 'FinanceApp/1.0',
            'Accept': 'application/json'
          },
          // Add timeout using AbortController
          signal: AbortSignal.timeout(5000)
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`${source.name} response:`, data);
          
          const parsedRates = source.parser(data);
          
          if (parsedRates && Object.keys(parsedRates).length > 0) {
            Object.assign(rates, parsedRates);
            console.log(`Successfully fetched rates from ${source.name}:`, Object.keys(rates).length, 'currencies');
            break;
          }
        } else {
          console.warn(`${source.name} returned status:`, response.status);
        }
      } catch (sourceError) {
        console.warn(`Failed to fetch from ${source.name}:`, sourceError);
        continue;
      }
    }

    // If no external source worked, use a fallback with some common rates
    if (Object.keys(rates).length === 0) {
      console.log('Using fallback exchange rates');
      return getFallbackRates();
    }

    return rates;
  } catch (error) {
    console.error('Error in fetchExchangeRates:', error);
    return getFallbackRates();
  }
}

function getDefaultRates(): { [key: string]: number } {
  return {
    'USD': 1,
    'INR': 83.5,
    'EUR': 0.92,
    'GBP': 0.79,
    'JPY': 150.0,
    'CAD': 1.35,
    'AUD': 1.52,
    'CHF': 0.88,
    'CNY': 7.2,
    'SEK': 10.8,
    'NOK': 10.5,
    'DKK': 6.9,
    'PLN': 4.0,
    'CZK': 23.0,
    'HUF': 360.0,
    'RUB': 92.0,
    'BRL': 5.0,
    'MXN': 17.0,
    'KRW': 1300.0,
    'SGD': 1.35,
    'HKD': 7.8,
    'NZD': 1.62,
    'ZAR': 18.5,
    'TRY': 30.0,
    'AED': 3.67,
    'SAR': 3.75,
    'QAR': 3.64,
    'KWD': 0.31,
    'BHD': 0.38,
    'OMR': 0.38,
    'JOD': 0.71,
    'LBP': 15000.0,
    'EGP': 31.0,
    'MAD': 10.0,
    'TND': 3.1,
    'DZD': 134.0,
    'LYD': 4.8,
    'SDG': 600.0,
    'ETB': 55.0,
    'KES': 160.0,
    'UGX': 3700.0,
    'TZS': 2500.0,
    'MWK': 1700.0,
    'ZMW': 25.0,
    'BWP': 13.5,
    'SZL': 18.5,
    'LSL': 18.5,
    'NAD': 18.5,
    'MUR': 45.0,
    'SCR': 13.5,
    'MVR': 15.4,
    'LKR': 325.0,
    'BDT': 110.0,
    'NPR': 133.0,
    'PKR': 280.0,
    'AFN': 70.0,
    'IRR': 42000.0,
    'IQD': 1310.0,
    'SYP': 13000.0,
    'YER': 250.0,
    'ILS': 3.7,
    'PEN': 3.7,
    'CLP': 920.0,
    'COP': 4100.0,
    'ARS': 850.0,
    'UYU': 39.0,
    'PYG': 7300.0,
    'BOB': 6.9,
    'VES': 36.0,
    'VEF': 36.0,
    'GYD': 209.0,
    'SRD': 37.0,
    'TTD': 6.8,
    'BBD': 2.0,
    'JMD': 155.0,
    'XCD': 2.7,
    'AWG': 1.8,
    'BZD': 2.0,
    'GTQ': 7.8,
    'HNL': 24.7,
    'NIO': 36.8,
    'CRC': 520.0,
    'PAB': 1.0,
    'DOP': 56.0,
    'HTG': 132.0,
    'CUP': 24.0,
    'BMD': 1.0,
    'KYD': 0.83,
    'BSD': 1.0
  };
}

function getFallbackRates(): { [key: string]: number } {
  // Return some basic rates that are commonly used
  return {
    'USD': 1,
    'INR': 83.5,
    'EUR': 0.92,
    'GBP': 0.79,
    'JPY': 150.0,
    'CAD': 1.35,
    'AUD': 1.52,
    'CHF': 0.88,
    'CNY': 7.2,
    'SEK': 10.8,
    'NOK': 10.5,
    'DKK': 6.9,
    'PLN': 4.0,
    'CZK': 23.0,
    'HUF': 360.0,
    'RUB': 92.0,
    'BRL': 5.0,
    'MXN': 17.0,
    'KRW': 1300.0,
    'SGD': 1.35,
    'HKD': 7.8,
    'NZD': 1.62,
    'ZAR': 18.5,
    'TRY': 30.0,
    'AED': 3.67,
    'SAR': 3.75,
    'QAR': 3.64,
    'KWD': 0.31,
    'BHD': 0.38,
    'OMR': 0.38,
    'JOD': 0.71,
    'LBP': 15000.0,
    'EGP': 31.0,
    'MAD': 10.0,
    'TND': 3.1,
    'DZD': 134.0,
    'LYD': 4.8,
    'SDG': 600.0,
    'ETB': 55.0,
    'KES': 160.0,
    'UGX': 3700.0,
    'TZS': 2500.0,
    'MWK': 1700.0,
    'ZMW': 25.0,
    'BWP': 13.5,
    'SZL': 18.5,
    'LSL': 18.5,
    'NAD': 18.5,
    'MUR': 45.0,
    'SCR': 13.5,
    'MVR': 15.4,
    'LKR': 325.0,
    'BDT': 110.0,
    'NPR': 133.0,
    'PKR': 280.0,
    'AFN': 70.0,
    'IRR': 42000.0,
    'IQD': 1310.0,
    'SYP': 13000.0,
    'YER': 250.0,
    'ILS': 3.7,
    'PEN': 3.7,
    'CLP': 920.0,
    'COP': 4100.0,
    'ARS': 850.0,
    'UYU': 39.0,
    'PYG': 7300.0,
    'BOB': 6.9,
    'VES': 36.0,
    'VEF': 36.0,
    'GYD': 209.0,
    'SRD': 37.0,
    'TTD': 6.8,
    'BBD': 2.0,
    'JMD': 155.0,
    'XCD': 2.7,
    'AWG': 1.8,
    'BZD': 2.0,
    'GTQ': 7.8,
    'HNL': 24.7,
    'NIO': 36.8,
    'CRC': 520.0,
    'PAB': 1.0,
    'DOP': 56.0,
    'HTG': 132.0,
    'CUP': 24.0,
    'BMD': 1.0,
    'KYD': 0.83,
    'BSD': 1.0
  };
}
