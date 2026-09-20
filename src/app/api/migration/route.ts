import { NextResponse } from 'next/server';
import { getMigrationData } from '@/services/app-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getMigrationData();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
