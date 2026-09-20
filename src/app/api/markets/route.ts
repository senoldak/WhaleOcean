import { NextResponse } from 'next/server';
import { getMarketsData } from '@/services/app-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getMarketsData();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}
