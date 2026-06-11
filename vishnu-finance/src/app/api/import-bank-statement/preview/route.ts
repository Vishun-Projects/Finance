import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { buildImportPreview, type ImportPreviewRecord } from '@/lib/import-preview-service';
import type { StatementMetadata } from '@/lib/account-statement';

async function requireUser(request: NextRequest) {
  const token = request.cookies.get('auth-token');
  if (!token) return null;
  const user = await AuthService.getUserFromToken(token.value);
  if (!user || !user.isActive) return null;
  return user;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { records, metadata } = body as {
      records: ImportPreviewRecord[];
      metadata?: StatementMetadata;
    };

    if (!Array.isArray(records)) {
      return NextResponse.json({ error: 'records array required' }, { status: 400 });
    }

    const preview = await buildImportPreview(user.id, records, metadata);
    return NextResponse.json(preview);
  } catch (error) {
    console.error('[import-bank-statement/preview]', error);
    return NextResponse.json({ error: 'Failed to build import preview' }, { status: 500 });
  }
}
