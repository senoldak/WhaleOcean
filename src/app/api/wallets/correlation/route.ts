import { NextRequest, NextResponse } from 'next/server';
import { getWalletCorrelationData } from '@/services/app-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20;
    const customAddress = searchParams.get('customAddress') || undefined;
    const trackedOnly = searchParams.get('trackedOnly') === 'true';

    const data = await getWalletCorrelationData(false, { limit, customAddress, trackedOnly });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch wallet correlation data' },
      { status: 500 }
    );
  }
}
