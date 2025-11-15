import { NextResponse } from 'next/server';

/**
 * Check which OAuth providers are configured
 * Used by UI to conditionally render OAuth buttons
 */
export async function GET() {
  try {
    const providers = {
      google: !!(
        process.env.GOOGLE_OAUTH_CLIENT_ID && 
        process.env.GOOGLE_OAUTH_CLIENT_SECRET
      ),
      microsoft: !!(
        process.env.MICROSOFT_OAUTH_CLIENT_ID && 
        process.env.MICROSOFT_OAUTH_CLIENT_SECRET
      ),
      apple: !!(
        process.env.APPLE_OAUTH_CLIENT_ID && 
        process.env.APPLE_OAUTH_CLIENT_SECRET &&
        process.env.APPLE_OAUTH_TEAM_ID &&
        process.env.APPLE_OAUTH_KEY_ID
      ),
    };

    return NextResponse.json({
      success: true,
      providers,
    });
  } catch (error) {
    console.error('Error checking OAuth config:', error);
    return NextResponse.json(
      { 
        success: false, 
        providers: { google: false, microsoft: false, apple: false } 
      },
      { status: 500 }
    );
  }
}

