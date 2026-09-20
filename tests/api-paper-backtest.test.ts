import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getRecommendations } from '../src/app/api/recommendations/route';
import { POST as runBacktestRoute } from '../src/app/api/backtest/route';
import { GET as getPortfolio, POST as resetPortfolio } from '../src/app/api/paper/portfolio/route';
import { POST as placeOrderRoute } from '../src/app/api/paper/order/route';
import { POST as copyRoute } from '../src/app/api/paper/copy/route';

describe('Paper Trading & Backtest API Routes', () => {
  it('GET /api/recommendations returns 200 and recommendations array', async () => {
    const req = new NextRequest('http://localhost:3000/api/recommendations?minScore=50');
    const res = await getRecommendations(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('recommendations');
    expect(Array.isArray(data.recommendations)).toBe(true);
  });

  it('POST /api/backtest executes backtest and returns result structure', async () => {
    const req = new NextRequest('http://localhost:3000/api/backtest', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'OCEAN_RULE_STRATEGY',
        asset: 'BTC',
        initialCapital: 100000,
        leverage: 2,
      }),
    });
    const res = await runBacktestRoute(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('summary');
    expect(data).toHaveProperty('equityCurve');
    expect(data.summary).toHaveProperty('sharpeRatio');
    expect(data.summary).toHaveProperty('maxDrawdownPct');
  });

  it('GET and POST /api/paper/portfolio manages portfolio state', async () => {
    const reqGet = new NextRequest('http://localhost:3000/api/paper/portfolio');
    const resGet = await getPortfolio(reqGet);
    expect(resGet.status).toBe(200);
    const dataGet = await resGet.json();
    expect(dataGet).toHaveProperty('portfolio');
    expect(dataGet.portfolio.initialBalance).toBe(100000);

    const reqReset = new NextRequest('http://localhost:3000/api/paper/portfolio', {
      method: 'POST',
      body: JSON.stringify({ initialBalance: 100000 }),
    });
    const resReset = await resetPortfolio(reqReset);
    expect(resReset.status).toBe(200);
  });

  it('POST /api/paper/order handles buy/sell orders', async () => {
    const reqOrder = new NextRequest('http://localhost:3000/api/paper/order', {
      method: 'POST',
      body: JSON.stringify({
        action: 'OPEN',
        asset: 'BTC',
        side: 'LONG',
        notional: 5000,
        leverage: 5,
        currentMarketPrice: 90000,
      }),
    });
    const resOrder = await placeOrderRoute(reqOrder);
    expect(resOrder.status).toBe(200);
    const data = await resOrder.json();
    expect(data.position.asset).toBe('BTC');
  });

  it('POST /api/paper/copy subscribes and unsubscribes to whale copy', async () => {
    const reqSub = new NextRequest('http://localhost:3000/api/paper/copy', {
      method: 'POST',
      body: JSON.stringify({
        action: 'SUBSCRIBE',
        walletAddress: '0x1234567890123456789012345678901234567890',
        allocatedUsd: 15000,
        multiplier: 1.0,
      }),
    });
    const resSub = await copyRoute(reqSub);
    expect(resSub.status).toBe(200);
    const dataSub = await resSub.json();
    expect(dataSub.subscription.allocatedUsd).toBe(15000);

    const reqUnsub = new NextRequest('http://localhost:3000/api/paper/copy', {
      method: 'POST',
      body: JSON.stringify({
        action: 'UNSUBSCRIBE',
        subscriptionId: dataSub.subscription.id,
      }),
    });
    const resUnsub = await copyRoute(reqUnsub);
    expect(resUnsub.status).toBe(200);
  });
});
