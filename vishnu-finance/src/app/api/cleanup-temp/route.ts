import { NextRequest, NextResponse } from 'next/server';
import { unlink, readdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { verifyCronSecret } from '@/lib/api-auth';

const TEMP_SUBDIRS = [
  'pdf-uploads',
  'multi-format-uploads',
  'bank-statement-uploads',
  'user-docs',
  'super-docs',
  'admin-docs',
];

async function cleanupOldTempFiles() {
  const uploadsDir = tmpdir();
  const oldFiles: string[] = [];
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000;

  for (const subdir of TEMP_SUBDIRS) {
    const subdirPath = `${uploadsDir}/${subdir}`;
    const entries = await readdir(subdirPath, { withFileTypes: true }).catch(() => []);

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const filepath = `${subdirPath}/${entry.name}`;
      try {
        const stats = await stat(filepath);
        if (now - stats.mtimeMs > maxAge) oldFiles.push(filepath);
      } catch {
        // skip
      }
    }
  }

  const rootEntries = await readdir(uploadsDir, { withFileTypes: true }).catch(() => []);
  for (const entry of rootEntries) {
    if (!entry.isFile()) continue;
    const file = entry.name;
    if (!file.includes('statement_') && !file.includes('extracted_') && !file.includes('temp_parser_')) {
      continue;
    }
    const filepath = `${uploadsDir}/${file}`;
    try {
      const stats = await stat(filepath);
      if (now - stats.mtimeMs > maxAge) oldFiles.push(filepath);
    } catch {
      // skip
    }
  }

  const results = { deleted: [] as string[], failed: [] as Array<{ file: string; error: string }> };
  for (const filepath of oldFiles) {
    try {
      await unlink(filepath);
      results.deleted.push(filepath);
    } catch (error) {
      results.failed.push({
        file: filepath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  return results;
}

export async function GET(request: NextRequest) {
  const cronError = verifyCronSecret(request);
  if (cronError) return cronError;

  try {
    const results = await cleanupOldTempFiles();
    return NextResponse.json({
      success: true,
      ...results,
      message: `Auto-cleaned ${results.deleted.length} old files, ${results.failed.length} failed`,
    });
  } catch (error) {
    console.error('Auto-cleanup error:', error);
    return NextResponse.json(
      { error: 'Auto-cleanup failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

/** POST removed — arbitrary client-supplied paths must not be deleted. Use GET with cron secret. */
export async function POST(request: NextRequest) {
  const cronError = verifyCronSecret(request);
  if (cronError) return cronError;

  return NextResponse.json(
    { error: 'Use GET with cron authorization for temp cleanup' },
    { status: 405 },
  );
}
