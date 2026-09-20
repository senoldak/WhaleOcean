import { NextResponse } from 'next/server';
import { getOceanConditionsData } from '@/services/app-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getOceanConditionsData();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch ocean conditions' },
      { status: 500 }
    );
  }
}
