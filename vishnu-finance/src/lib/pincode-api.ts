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

  try {
    // Try the Search-By-Pincode endpoint first
    const url = `http://www.postalpincode.in/api/pincode/${pincode}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      // If API fails, try alternative endpoint
      return await fetchLocationByPincodeAlternative(pincode);
    }

    const data = await response.json();
    
    // Parse the response structure from postalpincode.in
    if (data.Status === 'Success' && data.PostOffice && data.PostOffice.length > 0) {
      const postOffice = data.PostOffice[0];
      
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
    
    // Try alternative method
    try {
      return await fetchLocationByPincodeAlternative(pincode);
    } catch (altError) {
      return {
        success: false,
        error: 'Unable to fetch location data. Please try again later.'
      };
    }
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
    });

    if (!response.ok) {
      throw new Error('Pincode lookup failed');
    }

    const data = await response.json();
    return data;
  } catch (error) {
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

