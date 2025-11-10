/**
 * Pincode API utility for fetching location data from postalpincode.in
 */

export interface PincodeLocation {
  city: string;
  state: string;
  district: string;
  country: string;
}

export interface PincodeResponse {
  success: boolean;
  data?: PincodeLocation;
  error?: string;
}

/**
 * Fetch location data from pincode using postalpincode.in API
 * 
 * @param pincode - Indian postal pincode (6 digits)
 * @returns Location data or error
 */
export async function fetchLocationByPincode(pincode: string): Promise<PincodeResponse> {
  // Validate pincode format (should be 6 digits)
  const pincodeRegex = /^\d{6}$/;
  if (!pincodeRegex.test(pincode)) {
    return {
      success: false,
      error: 'Invalid pincode format. Please enter a 6-digit pincode.'
    };
  }

  // Prefer the server-side proxy to avoid CORS issues
  const proxyResult = await fetchLocationByPincodeAlternative(pincode);
  if (proxyResult.success || proxyResult.error) {
    return proxyResult;
  }

  // Fallback to direct fetch (should rarely be needed)
  try {
    const url = `http://www.postalpincode.in/api/pincode/${pincode}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: 'Unable to fetch location data. Please try again later.'
      };
    }

    const data = await response.json();
    console.log('[Pincode Lookup] Direct API response:', data);
    const result = Array.isArray(data) ? data[0] : data;

    if (result?.Status === 'Success' && result.PostOffice && result.PostOffice.length > 0) {
      const postOffice = result.PostOffice[0];

      return {
        success: true,
        data: {
          city: postOffice.District || postOffice.Name || '',
          state: postOffice.State || '',
          district: postOffice.District || '',
          country: postOffice.Country || 'India'
        }
      };
    }

    return {
      success: false,
      error: 'Pincode not found. Please verify the pincode and try again.'
    };
  } catch (error) {
    console.error('Error fetching pincode data:', error);
    return {
      success: false,
      error: 'Unable to fetch location data. Please try again later.'
    };
  }
}

/**
 * Alternative method using server-side proxy API route
 */
async function fetchLocationByPincodeAlternative(pincode: string): Promise<PincodeResponse> {
  try {
    // Use the server-side API route that proxies the request
    const response = await fetch(`/api/pincode-lookup?pincode=${pincode}`, {
      method: 'GET',
      cache: 'no-store',
    });

    if (!response.ok) {
      return {
        success: false,
        error: 'Unable to fetch location data. Please try again later.'
      };
    }

    const data = await response.json();
    console.log('[Pincode Lookup] Proxy response:', data);
    return data;
  } catch (error) {
    console.error('Error calling pincode proxy:', error);
    return {
      success: false,
      error: 'Unable to fetch location data. Please try again later.'
    };
  }
}

/**
 * Validate Indian phone number format
 */
export function validateIndianPhoneNumber(phone: string): boolean {
  // Indian phone numbers: 10 digits, optionally prefixed with +91 or 0
  const phoneRegex = /^(\+91|0)?[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\s+/g, ''));
}

/**
 * Format Indian phone number for display
 */
export function formatIndianPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
  }
  
  return phone;
}

