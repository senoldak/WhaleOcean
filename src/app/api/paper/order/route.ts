import { NextRequest, NextResponse } from 'next/server';
import { submitPaperOrder, closePaperOrder } from '@/services/app-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === 'CLOSE') {
      if (!body.positionId) {
        return NextResponse.json({ error: 'positionId is required to close a position' }, { status: 400 });
      }
      const trade = await closePaperOrder(body.positionId, body.exitPrice, body.reason || 'MANUAL');
      return NextResponse.json({ success: true, trade });
    }

    // Default action: OPEN
    const position = await submitPaperOrder({
      portfolioId: body.portfolioId || 'default',
      asset: body.asset,
      side: body.side,
      notional: body.notional,
      leverage: body.leverage || 1,
      currentMarketPrice: body.currentMarketPrice,
      takeProfit: body.takeProfit ?? null,
      stopLoss: body.stopLoss ?? null,
      source: body.source || 'MANUAL',
      sourceWallet: body.sourceWallet ?? null,
    });

    return NextResponse.json({ success: true, position });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to process paper order' },
      { status: 500 }
    );
  }
}
