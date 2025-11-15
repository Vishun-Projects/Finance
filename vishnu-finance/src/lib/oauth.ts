import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';

const GOOGLE_OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const GOOGLE_OAUTH_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

// Determine redirect URI based on environment
const getRedirectURI = (): string => {
  // If explicitly set in env, use that
  if (process.env.GOOGLE_OAUTH_REDIRECT_URI) {
    return process.env.GOOGLE_OAUTH_REDIRECT_URI;
  }
  
  // Check if we're in production (Vercel)
  const isProduction = process.env.VERCEL || process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    return 'https://vishun-finance.vercel.app/api/auth/oauth/google/callback';
  }
  
  // Default to localhost for development
  return 'http://localhost:3000/api/auth/oauth/google/callback';
};

const GOOGLE_OAUTH_REDIRECT_URI = getRedirectURI();

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

