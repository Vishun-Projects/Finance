import { NextRequest, NextResponse } from 'next/server';
import { unlink, readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

export async function GET() {
  try {
    // Clean up files older than 24 hours from temp directories
    const uploadsDir = tmpdir();

    try {
      const tempSubdirs = ['pdf-uploads', 'multi-format-uploads', 'bank-statement-uploads', 'user-docs', 'super-docs', 'admin-docs'];
      const oldFiles: string[] = [];
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      // Try to clean up files in temp subdirectories
      for (const subdir of tempSubdirs) {
        try {
          const subdirPath = uploadsDir.endsWith('/') || uploadsDir.endsWith('\\')
            ? `${uploadsDir}${subdir}`
            : `${uploadsDir}/${subdir}`;

          const entries = await readdir(subdirPath, { withFileTypes: true }).catch(() => []);

          for (const entry of entries) {
            if (!entry.isFile()) continue;

            const name = entry.name;
            const filepath = subdirPath.endsWith('/') || subdirPath.endsWith('\\')
              ? `${subdirPath}${name}`
              : `${subdirPath}/${name}`;

            try {
              const stats = await stat(filepath);
              if (now - stats.mtimeMs > maxAge) {
                oldFiles.push(filepath);
              }
            } catch {
              // Ignore errors
            }
          }
        } catch {
          // Ignore errors
        }
      }

      // Also check root temp directory for any orphaned files
      try {
        const rootEntries = await readdir(uploadsDir, { withFileTypes: true }).catch(() => []);
        for (const entry of rootEntries) {
          if (!entry.isFile()) continue;

          const file = entry.name;
          const filepath = uploadsDir.endsWith('/') || uploadsDir.endsWith('\\')
            ? `${uploadsDir}${file}`
            : `${uploadsDir}/${file}`;

          try {
            const stats = await stat(filepath);
            if (now - stats.mtimeMs > maxAge) {
              // Only clean files that look like our temp files
              if (file.includes('statement_') || file.includes('extracted_') || file.includes('temp_parser_')) {
                oldFiles.push(filepath);
              }
            }
          } catch {
            // Skip
          }
        }
      } catch {
        // Skip
      }

      // Delete old files
      const results = {
        deleted: [] as string[],
        failed: [] as Array<{ file: string; error: string }>,
      };

      for (const filepath of oldFiles) {
        try {
          await unlink(filepath);
          results.deleted.push(filepath);
          console.log('✅ Auto-cleaned up old file:', filepath);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          results.failed.push({ file: filepath, error: errorMsg });
          console.warn('⚠️ Failed to delete old file:', filepath, errorMsg);
        }
      }

      return NextResponse.json({
        success: true,
        ...results,
        message: `Auto-cleaned ${results.deleted.length} old files, ${results.failed.length} failed`
      });
    } catch (error) {
      console.warn('⚠️ Could not read uploads directory:', error);
      return NextResponse.json({
        success: false,
        message: 'Could not access uploads directory',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('❌ Auto-cleanup error:', error);
    return NextResponse.json({
      error: 'Auto-cleanup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { files } = await request.json();

    if (!files || !Array.isArray(files)) {
      return NextResponse.json({ error: 'Files array required' }, { status: 400 });
    }

    const results = {
      deleted: [] as string[],
      failed: [] as Array<{ file: string; error: string }>,
    };

    for (const filepath of files) {
      try {
        await unlink(filepath);
        results.deleted.push(filepath);
        console.log('✅ Cleaned up:', filepath);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        results.failed.push({ file: filepath, error: errorMsg });
        console.warn('⚠️ Failed to delete:', filepath, errorMsg);
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      message: `Deleted ${results.deleted.length} files, ${results.failed.length} failed`
    });
  } catch (error) {
    console.error('❌ Cleanup error:', error);
    return NextResponse.json({
      error: 'Cleanup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
