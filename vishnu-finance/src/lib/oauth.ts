import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';

// Google OAuth
const GOOGLE_OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const GOOGLE_OAUTH_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

// Microsoft OAuth (Azure AD)
const MICROSOFT_OAUTH_CLIENT_ID = process.env.MICROSOFT_OAUTH_CLIENT_ID;
const MICROSOFT_OAUTH_CLIENT_SECRET = process.env.MICROSOFT_OAUTH_CLIENT_SECRET;
const MICROSOFT_OAUTH_TENANT_ID = process.env.MICROSOFT_OAUTH_TENANT_ID || 'common';

// Apple Sign In
const APPLE_OAUTH_CLIENT_ID = process.env.APPLE_OAUTH_CLIENT_ID;
const APPLE_OAUTH_CLIENT_SECRET = process.env.APPLE_OAUTH_CLIENT_SECRET;
const APPLE_OAUTH_TEAM_ID = process.env.APPLE_OAUTH_TEAM_ID;
const APPLE_OAUTH_KEY_ID = process.env.APPLE_OAUTH_KEY_ID;

// Determine redirect URI based on environment
const getRedirectURI = (provider: 'google' | 'microsoft' | 'apple'): string => {
  const envVar = `${provider.toUpperCase()}_OAUTH_REDIRECT_URI`;
  // If explicitly set in env, use that
  if (process.env[envVar]) {
    return process.env[envVar]!;
  }
  
  // Check if we're in production (Vercel)
  const isProduction = process.env.VERCEL || process.env.NODE_ENV === 'production';
  const baseUrl = isProduction 
    ? 'https://vishun-finance.vercel.app' 
    : 'http://localhost:3000';
  
  return `${baseUrl}/api/auth/oauth/${provider}/callback`;
};

const GOOGLE_OAUTH_REDIRECT_URI = getRedirectURI('google');
const MICROSOFT_OAUTH_REDIRECT_URI = getRedirectURI('microsoft');
const APPLE_OAUTH_REDIRECT_URI = getRedirectURI('apple');

if (!GOOGLE_OAUTH_CLIENT_ID || !GOOGLE_OAUTH_CLIENT_SECRET) {
  console.warn('⚠️ Google OAuth credentials not set. OAuth authentication will not work.');
}

// Create OAuth2 client
export const oauth2Client = GOOGLE_OAUTH_CLIENT_ID && GOOGLE_OAUTH_CLIENT_SECRET
  ? new OAuth2Client(
      GOOGLE_OAUTH_CLIENT_ID,
      GOOGLE_OAUTH_CLIENT_SECRET,
      GOOGLE_OAUTH_REDIRECT_URI
    )
  : null;

/**
 * Generate PKCE code verifier and challenge
 */
export function generatePKCE(): { codeVerifier: string; codeChallenge: string; state: string } {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  const state = crypto.randomBytes(16).toString('base64url');
  
  return { codeVerifier, codeChallenge, state };
}

/**
 * Generate Google OAuth authorization URL
 */
export function generateGoogleOAuthURL(codeChallenge: string, state: string): string {
  if (!oauth2Client) {
    throw new Error('Google OAuth client not configured');
  }

  const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'openid',
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    include_granted_scopes: true,
    state,
    code_challenge: codeChallenge,
    // @ts-expect-error - 'S256' is valid PKCE method but types may not include it
    code_challenge_method: 'S256',
  });

  return authUrl;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string
): Promise<{ idToken: string; accessToken: string }> {
  if (!oauth2Client) {
    throw new Error('Google OAuth client not configured');
  }

  const { tokens } = await oauth2Client.getToken({
    code,
    codeVerifier,
  });

  if (!tokens.id_token) {
    throw new Error('No ID token received from Google');
  }

  return {
    idToken: tokens.id_token,
    accessToken: tokens.access_token || '',
  };
}

/**
 * Verify and decode Google ID token
 */
export async function verifyGoogleIdToken(idToken: string): Promise<{
  email: string;
  name: string;
  picture?: string;
  sub: string;
}> {
  if (!oauth2Client) {
    throw new Error('Google OAuth client not configured');
  }

  const ticket = await oauth2Client.verifyIdToken({
    idToken,
    audience: GOOGLE_OAUTH_CLIENT_ID!,
  });

  const payload = ticket.getPayload();
  if (!payload) {
    throw new Error('Invalid ID token payload');
  }

  if (!payload.email) {
    throw new Error('Email not found in ID token');
  }

  return {
    email: payload.email,
    name: payload.name || payload.email.split('@')[0],
    picture: payload.picture,
    sub: payload.sub,
  };
}

/**
 * ============================================================================
 * MICROSOFT OAUTH (Azure AD)
 * ============================================================================
 */

/**
 * Generate Microsoft OAuth authorization URL
 * Returns null if credentials are not configured
 */
export function generateMicrosoftOAuthURL(codeChallenge: string, state: string): string | null {
  if (!MICROSOFT_OAUTH_CLIENT_ID) {
    return null;
  }

  const scopes = ['openid', 'email', 'profile'];
  const scopeParam = scopes.join(' ');

  const params = new URLSearchParams({
    client_id: MICROSOFT_OAUTH_CLIENT_ID,
    response_type: 'code',
    redirect_uri: MICROSOFT_OAUTH_REDIRECT_URI,
    response_mode: 'query',
    scope: scopeParam,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `https://login.microsoftonline.com/${MICROSOFT_OAUTH_TENANT_ID}/oauth2/v2.0/authorize?${params.toString()}`;
}

/**
 * Exchange Microsoft authorization code for tokens
 */
export async function exchangeMicrosoftCodeForTokens(
  code: string,
  codeVerifier: string
): Promise<{ idToken: string; accessToken: string }> {
  if (!MICROSOFT_OAUTH_CLIENT_ID || !MICROSOFT_OAUTH_CLIENT_SECRET) {
    throw new Error('Microsoft OAuth credentials not configured');
  }

  const tokenUrl = `https://login.microsoftonline.com/${MICROSOFT_OAUTH_TENANT_ID}/oauth2/v2.0/token`;
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: MICROSOFT_OAUTH_CLIENT_ID,
      client_secret: MICROSOFT_OAUTH_CLIENT_SECRET,
      code,
      redirect_uri: MICROSOFT_OAUTH_REDIRECT_URI,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Microsoft token exchange failed: ${error}`);
  }

  const tokens = await response.json();

  if (!tokens.id_token) {
    throw new Error('No ID token received from Microsoft');
  }

  return {
    idToken: tokens.id_token,
    accessToken: tokens.access_token || '',
  };
}

/**
 * Verify and decode Microsoft ID token
 */
export async function verifyMicrosoftIdToken(idToken: string): Promise<{
  email: string;
  name: string;
  picture?: string;
  sub: string;
}> {
  // Decode JWT token (Microsoft tokens are standard JWT)
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid Microsoft ID token format');
  }

  // Decode payload (base64url)
  const payload = JSON.parse(
    Buffer.from(parts[1], 'base64url').toString('utf-8')
  );

  // Verify audience
  if (payload.aud !== MICROSOFT_OAUTH_CLIENT_ID) {
    throw new Error('Invalid Microsoft ID token audience');
  }

  // Verify issuer (Microsoft)
  if (!payload.iss?.includes('microsoftonline.com')) {
    throw new Error('Invalid Microsoft ID token issuer');
  }

  if (!payload.email && !payload.preferred_username) {
    throw new Error('Email not found in Microsoft ID token');
  }

  const email = payload.email || payload.preferred_username;
  const name = payload.name || payload.given_name + ' ' + (payload.family_name || '') || email.split('@')[0];

  return {
    email,
    name: name.trim(),
    picture: payload.picture,
    sub: payload.sub || payload.oid,
  };
}

/**
 * ============================================================================
 * APPLE SIGN IN
 * ============================================================================
 */

/**
 * Generate Apple Sign In authorization URL
 * Returns null if credentials are not configured
 */
export function generateAppleOAuthURL(codeChallenge: string, state: string): string | null {
  if (!APPLE_OAUTH_CLIENT_ID) {
    return null;
  }

  const scopes = ['name', 'email'];
  const scopeParam = scopes.join(' ');

  const params = new URLSearchParams({
    client_id: APPLE_OAUTH_CLIENT_ID,
    redirect_uri: APPLE_OAUTH_REDIRECT_URI,
    response_type: 'code',
    response_mode: 'query', // Use query for web, form_post is for native apps
    scope: scopeParam,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
}

/**
 * Generate Apple client secret (JWT)
 * Apple requires a JWT signed with ES256 algorithm
 */
function generateAppleClientSecret(): string {
  if (!APPLE_OAUTH_CLIENT_ID || !APPLE_OAUTH_TEAM_ID || !APPLE_OAUTH_KEY_ID || !APPLE_OAUTH_CLIENT_SECRET) {
    throw new Error('Apple OAuth credentials not fully configured');
  }

  // Apple client secret is a JWT signed with ES256
  // For now, we'll use the provided secret if it's already a JWT
  // In production, you should generate this JWT using the private key
  // This is a simplified version - you may need to use a library like 'jsonwebtoken' with ES256
  
  // If APPLE_OAUTH_CLIENT_SECRET is already a JWT, use it directly
  // Otherwise, it should be the private key content and we need to generate JWT
  // For simplicity, assuming it's provided as a JWT or we'll need to generate it
  return APPLE_OAUTH_CLIENT_SECRET;
}

/**
 * Exchange Apple authorization code for tokens
 */
export async function exchangeAppleCodeForTokens(
  code: string,
  codeVerifier: string
): Promise<{ idToken: string; accessToken: string }> {
  if (!APPLE_OAUTH_CLIENT_ID) {
    throw new Error('Apple OAuth client ID not configured');
  }

  const clientSecret = generateAppleClientSecret();
  const tokenUrl = 'https://appleid.apple.com/auth/token';
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: APPLE_OAUTH_CLIENT_ID,
      client_secret: clientSecret,
      code,
      redirect_uri: APPLE_OAUTH_REDIRECT_URI,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Apple token exchange failed: ${error}`);
  }

  const tokens = await response.json();

  if (!tokens.id_token) {
    throw new Error('No ID token received from Apple');
  }

  return {
    idToken: tokens.id_token,
    accessToken: tokens.access_token || '',
  };
}

/**
 * Verify and decode Apple ID token
 */
export async function verifyAppleIdToken(idToken: string): Promise<{
  email: string;
  name: string;
  picture?: string;
  sub: string;
}> {
  // Decode JWT token (Apple tokens are standard JWT)
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid Apple ID token format');
  }

  // Decode payload (base64url)
  const payload = JSON.parse(
    Buffer.from(parts[1], 'base64url').toString('utf-8')
  );

  // Verify audience
  if (payload.aud !== APPLE_OAUTH_CLIENT_ID) {
    throw new Error('Invalid Apple ID token audience');
  }

  // Verify issuer (Apple)
  if (payload.iss !== 'https://appleid.apple.com') {
    throw new Error('Invalid Apple ID token issuer');
  }

  if (!payload.email && !payload.sub) {
    throw new Error('Email or subject not found in Apple ID token');
  }

  // Apple may not always provide email in subsequent logins
  // Use sub (subject) as fallback identifier
  const email = payload.email || `${payload.sub}@privaterelay.appleid.com`;
  const name = payload.name 
    ? `${payload.name.givenName || ''} ${payload.name.familyName || ''}`.trim()
    : email.split('@')[0];

  return {
    email,
    name: name || email.split('@')[0],
    picture: undefined, // Apple doesn't provide profile pictures
    sub: payload.sub,
  };
}

