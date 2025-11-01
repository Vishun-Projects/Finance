import { NextRequest, NextResponse } from 'next/server';
import { unlink, readdir, stat } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    // Clean up files older than 24 hours
    const uploadsDir = join(process.cwd(), 'uploads');
    
    try {
      const files = await readdir(uploadsDir);
      
      const oldFiles = [];
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      for (const file of files) {
        const filepath = join(uploadsDir, file);
        try {
          const stats = await stat(filepath);
          if (now - stats.mtimeMs > maxAge) {
            oldFiles.push(filepath);
          }
        } catch (error) {
          console.warn('⚠️ Could not stat file:', filepath, error);
        }
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

