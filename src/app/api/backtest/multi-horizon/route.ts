import { NextRequest, NextResponse } from 'next/server';
import { getMultiHorizonBacktestData } from '@/services/app-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 25;
    const customAddress = searchParams.get('customAddress') || undefined;
    const trackedOnly = searchParams.get('trackedOnly') === 'true';

    const data = await getMultiHorizonBacktestData(false, { limit, customAddress, trackedOnly });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch multi-horizon backtest data' },
      { status: 500 }
    );
  }
}
