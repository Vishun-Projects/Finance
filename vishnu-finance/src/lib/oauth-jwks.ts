import { createRemoteJWKSet, jwtVerify } from 'jose';

const microsoftJwks = createRemoteJWKSet(
  new URL('https://login.microsoftonline.com/common/discovery/v2.0/keys'),
);

const appleJwks = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

export async function verifyMicrosoftIdTokenSignature(
  idToken: string,
  clientId: string,
): Promise<Record<string, unknown>> {
  const { payload } = await jwtVerify(idToken, microsoftJwks, {
    audience: clientId,
  });

  const iss = String(payload.iss ?? '');
  if (!iss.includes('microsoftonline.com')) {
    throw new Error('Invalid Microsoft ID token issuer');
  }

  return payload as Record<string, unknown>;
}

export async function verifyAppleIdTokenSignature(
  idToken: string,
  clientId: string,
): Promise<Record<string, unknown>> {
  const { payload } = await jwtVerify(idToken, appleJwks, {
    audience: clientId,
    issuer: 'https://appleid.apple.com',
  });

  return payload as Record<string, unknown>;
}
