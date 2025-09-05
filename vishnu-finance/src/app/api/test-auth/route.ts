import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('🧪 TEST AUTH - Starting test request');
  
  try {
    // Get the auth token from cookies
    const authToken = request.cookies.get('auth-token');
    console.log('🧪 TEST AUTH - Auth token found:', !!authToken);
    console.log('🧪 TEST AUTH - Auth token value:', authToken?.value?.substring(0, 20) + '...');

    if (!authToken) {
      console.log('❌ TEST AUTH - No auth token found');
      return NextResponse.json({ 
        error: 'No authentication token',
        cookies: request.cookies.getAll().map(c => ({ name: c.name, value: c.value?.substring(0, 20) + '...' }))
      }, { status: 401 });
    }

    // Return success with token info
    return NextResponse.json({ 
      success: true,
      hasToken: true,
      tokenLength: authToken.value.length,
      tokenPreview: authToken.value.substring(0, 20) + '...',
      allCookies: request.cookies.getAll().map(c => ({ name: c.name, value: c.value?.substring(0, 20) + '...' }))
    });
  } catch (error) {
    console.error('❌ TEST AUTH - Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
