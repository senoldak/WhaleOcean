import { NextResponse } from 'next/server';
import { getPodsData } from '@/services/app-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getPodsData();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
