import { NextRequest, NextResponse } from 'next/server';
import { resolve, join } from 'node:path';
export const dynamic = 'force-dynamic';
import { readFile, stat } from 'node:fs/promises';
import { prisma } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { AuthService } from '@/lib/auth';
import { extractRequestMeta, writeAuditLog } from '@/lib/audit';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const authToken = request.cookies.get('auth-token');
        if (!authToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const document = await prisma.superDocument.findUnique({
            where: { id },
        });

        if (!document) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        const user = await AuthService.getUserFromToken(authToken.value);
        // Allow if user is authenticated. Specific visibility logic can be added here.
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Toggle legacy vs Supabase
        if (document.storageKey.startsWith('uploads/') || document.storageKey.includes('\\')) {
            try {
                // Legacy local file
                const storageKey = document.storageKey;
                const base = process.cwd();
                const filePath = base.endsWith('/') || base.endsWith('\\')
                    ? `${base}${storageKey}`
                    : `${base}/${storageKey}`;
                await stat(filePath);
                const fileBuffer = await readFile(filePath);

                const headers = new Headers();
                headers.set('Content-Type', document.mimeType || 'application/octet-stream');
                headers.set(
                    'Content-Disposition',
                    `attachment; filename="${encodeURIComponent(document.originalName)}"`,
                );
                return new NextResponse(new Uint8Array(fileBuffer), { status: 200, headers });
            } catch (e: any) {
                if (e.code === 'ENOENT') {
                    return NextResponse.json({ error: 'File not found locally' }, { status: 404 });
                }
                throw e;
            }
        }

        // Supabase Download
        const { data, error } = await supabase.storage
            .from('super-docs')
            .createSignedUrl(document.storageKey, 3600);

        if (error || !data) {
            console.error('Failed to generate Supabase signed URL:', error);
            return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 });
        }

        const meta = extractRequestMeta(request);
        await writeAuditLog({
            actorId: user.id || 'unknown',
            event: 'DOCUMENT_DOWNLOAD',
            targetResource: `super-document:${document.id}`,
            metadata: { originalName: document.originalName, provider: 'supabase' },
            message: `${user.email || 'User'} downloaded super-document ${document.originalName}`,
            ipAddress: meta.ipAddress,
            userAgent: meta.userAgent,
        });

        return NextResponse.redirect(data.signedUrl);

    } catch (error) {
        console.error('Super document download failed:', error);
        return NextResponse.json(
            { error: 'Failed to download document' },
            { status: 500 },
        );
    }
}
