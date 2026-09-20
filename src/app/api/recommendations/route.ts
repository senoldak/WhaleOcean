import { NextRequest, NextResponse } from 'next/server';
import { getCompassRecommendations } from '@/services/app-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const persona = searchParams.get('persona') || undefined;
    const riskTier = searchParams.get('riskTier') || undefined;
    const minScore = searchParams.get('minScore') ? parseFloat(searchParams.get('minScore')!) : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;

    const data = await getCompassRecommendations({
      persona,
      riskTier,
      minScore,
      limit,
    });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch recommendations' },
      { status: 500 }
    );
  }
}
