import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { getGeminiQuotaStatus } from '@/lib/gemini';
import { getGroqRateLimitStatus, isGroqConfigured } from '@/lib/groq';
import { isGeminiQuotaBlocked } from '@/lib/gemini-quota';

async function requireUser(request: NextRequest) {
  const token = request.cookies.get('auth-token');
  if (!token) return null;
  const user = await AuthService.getUserFromToken(token.value);
  if (!user || !user.isActive) return null;
  return user;
}

/** Best-effort Gemini + Groq quota status for Advisor UI. */
export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const gemini = getGeminiQuotaStatus();
  const groq = getGroqRateLimitStatus();
  const activeProvider =
    isGeminiQuotaBlocked() && isGroqConfigured() ? 'groq' : 'gemini';

  return NextResponse.json({
    activeProvider,
    geminiBlocked: isGeminiQuotaBlocked(),
    groqConfigured: isGroqConfigured(),
    quota: gemini,
    groq,
    note:
      activeProvider === 'groq'
        ? 'Gemini free-tier exhausted — Advisor will use Groq free tier (llama-3.3-70b-versatile).'
        : 'Using Gemini when available; Groq is the free fallback after Gemini daily limits.',
  });
}
