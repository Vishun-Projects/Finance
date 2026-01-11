import { NextResponse } from 'next/server';
import { getMonitoringData } from '@/lib/monitoring';
import { requireAuth, securityHeaders } from '@/lib/security';

export const GET = requireAuth(async function () {
  try {
    const monitoringData = await getMonitoringData();
    
    const response = NextResponse.json(monitoringData);
    return securityHeaders(response);
  } catch (error) {
    console.error('Monitoring API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monitoring data' },
      { status: 500 }
    );
  }
});
