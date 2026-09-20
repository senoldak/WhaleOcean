import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getMultiHorizon } from '../src/app/api/backtest/multi-horizon/route';
import { POST as refreshMultiHorizon } from '../src/app/api/backtest/multi-horizon/refresh/route';
import { GET as getCorrelation } from '../src/app/api/wallets/correlation/route';
import { POST as subscribeBasket } from '../src/app/api/paper/basket-subscribe/route';

describe('Multi-Horizon & Correlation API Routes', () => {
  it('GET /api/backtest/multi-horizon returns multi-period leaderboard', async () => {
    const req = new NextRequest('http://localhost:3000/api/backtest/multi-horizon');
    const res = await getMultiHorizon(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.results).toBeDefined();
    expect(Array.isArray(data.results)).toBe(true);
    expect(data.count).toBeDefined();
  });

  it('POST /api/backtest/multi-horizon/refresh triggers recalculation', async () => {
    const req = new NextRequest('http://localhost:3000/api/backtest/multi-horizon/refresh', {
      method: 'POST',
    });
    const res = await refreshMultiHorizon(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.count).toBeDefined();
  });

  it('GET /api/wallets/correlation returns NxN matrix, clusters, and smart basket', async () => {
    const req = new NextRequest('http://localhost:3000/api/wallets/correlation');
    const res = await getCorrelation(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.wallets).toBeDefined();
    expect(data.matrix).toBeDefined();
    expect(Array.isArray(data.pairs)).toBe(true);
    expect(Array.isArray(data.syndicateClusters)).toBe(true);
    expect(data.smartBasket).toBeDefined();
    expect(data.smartBasket.items).toBeDefined();
  });

  it('POST /api/paper/basket-subscribe batch-subscribes basket to paper trading', async () => {
    const req = new NextRequest('http://localhost:3000/api/paper/basket-subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        portfolioId: 'default',
        items: [
          { address: '0x1234567890123456789012345678901234567890', allocatedUsd: 35000 },
          { address: '0x2222222222222222222222222222222222222222', allocatedUsd: 25000 },
        ],
      }),
    });
    const res = await subscribeBasket(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.count).toBe(2);
    expect(data.subscriptions.length).toBe(2);
  });
});
