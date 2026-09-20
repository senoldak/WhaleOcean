import { NextRequest, NextResponse } from 'next/server';
import { getWhaleProfile } from '@/services/app-service';

export const dynamic = 'force-dynamic';

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;

    if (!address || !ETH_ADDRESS_REGEX.test(address)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format. Expected 42-character hex string starting with 0x.' },
        { status: 400 }
      );
    }

    const profile = await getWhaleProfile(address);

    if (!profile) {
      return NextResponse.json(
        { error: `Wallet ${address} not currently observed in tracked universe` },
        { status: 404 }
      );
    }

    return NextResponse.json(profile);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch whale profile' },
      { status: 500 }
    );
  }
}
