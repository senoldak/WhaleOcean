import { NextResponse } from 'next/server';
import { getWhatChangedData } from '@/services/app-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getWhatChangedData();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch what changed events' },
      { status: 500 }
    );
  }
}
