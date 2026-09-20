import { NextRequest, NextResponse } from 'next/server';
import { getMultiHorizonBacktestData } from '@/services/app-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    let options = {};
    try {
      options = await req.json();
    } catch {
      // no body
    }
    const data = await getMultiHorizonBacktestData(true, options);
    return NextResponse.json({
      success: true,
      count: data.count,
      timestamp: data.timestamp,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to refresh multi-horizon backtest data' },
      { status: 500 }
    );
  }
}
