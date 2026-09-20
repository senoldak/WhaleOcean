import { NextRequest, NextResponse } from 'next/server';
import { subscribeSmartBasket } from '@/services/app-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = body.items || [];
    const portfolioId = body.portfolioId || 'default';

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or empty basket items' },
        { status: 400 }
      );
    }

    const result = await subscribeSmartBasket(items, portfolioId);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to subscribe to smart basket' },
      { status: 500 }
    );
  }
}
