import { NextRequest, NextResponse } from 'next/server';
import { managePaperSubscription } from '@/services/app-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || 'SUBSCRIBE';

    if (action === 'SUBSCRIBE') {
      if (!body.walletAddress || !body.allocatedUsd) {
        return NextResponse.json(
          { error: 'walletAddress and allocatedUsd are required for subscription' },
          { status: 400 }
        );
      }
      const subscription = await managePaperSubscription('SUBSCRIBE', body);
      return NextResponse.json({ success: true, subscription });
    } else {
      if (!body.subscriptionId) {
        return NextResponse.json(
          { error: 'subscriptionId is required to unsubscribe' },
          { status: 400 }
        );
      }
      const result = await managePaperSubscription('UNSUBSCRIBE', body);
      return NextResponse.json(result);
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to manage copy subscription' },
      { status: 500 }
    );
  }
}
