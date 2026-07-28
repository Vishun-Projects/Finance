import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { exportAdvisorMarkdown } from '@/lib/advisor-export';
import type { AdvisorOutputFormat } from '@/lib/advisor-format';

const ALLOWED = new Set(['csv', 'html', 'xlsx', 'pdf', 'docx']);

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
    const markdown = typeof body.markdown === 'string' ? body.markdown : '';
    const format = String(body.format || '').toLowerCase() as AdvisorOutputFormat;
    const title =
      typeof body.title === 'string' && body.title.trim()
        ? body.title.trim()
        : 'Vishnu Finance — Advisor export';

    if (!markdown.trim()) {
      return NextResponse.json({ error: 'markdown is required' }, { status: 400 });
    }
    if (!ALLOWED.has(format)) {
      return NextResponse.json(
        { error: 'format must be one of csv, html, xlsx, pdf, docx' },
        { status: 400 },
      );
    }

    const exported = await exportAdvisorMarkdown({
      markdown,
      format: format as 'csv' | 'html' | 'xlsx' | 'pdf' | 'docx',
      title,
    });

    return new NextResponse(new Uint8Array(exported.buffer), {
      status: 200,
      headers: {
        'Content-Type': exported.mimeType,
        // inline so browsers can preview blob/object URLs more reliably than attachment
        'Content-Disposition': `inline; filename="${exported.filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Advisor export failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 },
    );
  }
}
