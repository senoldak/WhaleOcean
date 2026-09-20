import { NextRequest, NextResponse } from 'next/server';
import { getTrailsData } from '@/services/app-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const asset = searchParams.get('asset')?.toUpperCase() || undefined;

    const rawEventType = searchParams.get('eventType')?.toUpperCase();
    const allowedEventTypes = ['OPEN', 'INCREASE', 'DECREASE', 'CLOSE', 'FLIP'];
    const eventType = rawEventType && allowedEventTypes.includes(rawEventType) ? rawEventType : undefined;

    const rawLimit = searchParams.get('limit');
    const parsedLimit = rawLimit ? parseInt(rawLimit, 10) : 100;
    const limit = Number.isFinite(parsedLimit) ? Math.min(1000, Math.max(1, parsedLimit)) : 100;

    const rawMinNotional = searchParams.get('minNotional');
    const parsedMinNotional = rawMinNotional ? parseFloat(rawMinNotional) : undefined;
    const minNotional =
      parsedMinNotional !== undefined && Number.isFinite(parsedMinNotional) && parsedMinNotional >= 0
        ? parsedMinNotional
        : undefined;

    const data = await getTrailsData({
      asset,
      eventType,
      limit,
      minNotional,
    });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
