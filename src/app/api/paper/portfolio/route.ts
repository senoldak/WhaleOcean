import { NextRequest, NextResponse } from 'next/server';
import { getPaperPortfolioState, resetPaperPortfolioState } from '@/services/app-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const portfolioId = searchParams.get('portfolioId') || 'default';

    const data = await getPaperPortfolioState(portfolioId);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch paper portfolio' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const portfolioId = body.portfolioId || 'default';
    const initialBalance = body.initialBalance || 100000;

    const resetState = await resetPaperPortfolioState(portfolioId, initialBalance);
    return NextResponse.json({ success: true, portfolio: resetState });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to reset paper portfolio' },
      { status: 500 }
    );
  }
}
