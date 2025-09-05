import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    // Test database connection and available models
    const result = {
      success: true,
      message: 'Database connection test',
      timestamp: new Date().toISOString(),
      availableModels: Object.keys(prisma),
      testQuery: null as any
    };

    // Try to access the salaryStructure model
    try {
      const testResult = await (prisma as any).salaryStructure.findFirst();
      result.testQuery = {
        success: true,
        hasData: !!testResult,
        data: testResult
      };
    } catch (modelError) {
      result.testQuery = {
        success: false,
        error: modelError instanceof Error ? modelError.message : 'Unknown model error'
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Database connection test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
