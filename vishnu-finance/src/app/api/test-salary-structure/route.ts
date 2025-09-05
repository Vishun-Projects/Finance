import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    // Test database connection
    const testResult = await prisma.salaryStructure.findFirst();
    
    return NextResponse.json({
      success: true,
      message: 'Database connection working',
      hasData: !!testResult,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test salary structure error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
