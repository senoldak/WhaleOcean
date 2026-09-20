import { NextResponse } from 'next/server';
import { getGraveyardData } from '@/services/app-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getGraveyardData();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
