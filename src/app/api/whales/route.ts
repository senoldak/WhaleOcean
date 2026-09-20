import { NextRequest, NextResponse } from 'next/server';
import { getWhalesData } from '@/services/app-service';
import { WhaleClassSchema } from '@/types/contracts';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tierParam = searchParams.get('tier');
    const parsedTier = tierParam ? WhaleClassSchema.safeParse(tierParam).data : undefined;

    const data = await getWhalesData(parsedTier);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch observed whales' },
      { status: 500 }
    );
  }
}
