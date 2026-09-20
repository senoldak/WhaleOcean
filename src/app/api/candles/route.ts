import { NextRequest, NextResponse } from 'next/server';
import { HyperliquidInfoClient } from '@/collector/hyperliquid-info';

export const dynamic = 'force-dynamic';

const infoClient = new HyperliquidInfoClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const coin = searchParams.get('coin')?.toUpperCase() || 'BTC';
    const interval = searchParams.get('interval') || '1h';

    const candles = await infoClient.getCandles(coin, interval);

    return NextResponse.json({
      coin,
      interval,
      candles,
      count: candles.length,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch candles' }, { status: 500 });
  }
}
