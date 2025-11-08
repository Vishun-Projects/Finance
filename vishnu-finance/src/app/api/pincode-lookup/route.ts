import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/pincode-lookup?pincode=123456
 * Proxy endpoint for pincode lookup (to handle CORS and server-side requests)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pincode = searchParams.get('pincode');

    if (!pincode) {
      return NextResponse.json({ 
        success: false, 
        error: 'Pincode is required' 
      }, { status: 400 });
    }

    // Validate pincode format
    const pincodeRegex = /^\d{6}$/;
    if (!pincodeRegex.test(pincode)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid pincode format. Please enter a 6-digit pincode.' 
      }, { status: 400 });
    }

    // Fetch from postalpincode.in API
    const apiUrl = `http://www.postalpincode.in/api/pincode/${pincode}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unable to fetch location data. Please try again later.' 
      }, { status: response.status });
    }

    const data = await response.json();
    
    // Parse the response structure from postalpincode.in
    if (data.Status === 'Success' && data.PostOffice && data.PostOffice.length > 0) {
      const postOffice = data.PostOffice[0];
      
      return NextResponse.json({
        success: true,
        data: {
          city: postOffice.District || postOffice.Name || '',
          state: postOffice.State || '',
          district: postOffice.District || '',
          country: postOffice.Country || 'India'
        }
      });
    }

    return NextResponse.json({ 
      success: false, 
      error: 'Pincode not found. Please verify the pincode and try again.' 
    }, { status: 404 });
  } catch (error) {
    console.error('Error in pincode lookup:', error);
    
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ 
        success: false, 
        error: 'Request timeout. Please try again.' 
      }, { status: 408 });
    }

    return NextResponse.json({ 
      success: false, 
      error: 'Unable to fetch location data. Please try again later.' 
    }, { status: 500 });
  }
}

