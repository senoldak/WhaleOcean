import { describe, it, expect, vi } from 'vitest';
import { HyperliquidInfoClient } from '../src/collector/hyperliquid-info';
import { HyperliquidWsClient } from '../src/collector/hyperliquid-ws';

describe('Hyperliquid Collector & Ingestion Tests', () => {
  it('should parse metaAndAssetCtxs into VerifiedMarketSnapshots', async () => {
    const mockMetaAndCtxs = [
      {
        universe: [
          { name: 'BTC', szDecimals: 5, maxLeverage: 50 },
          { name: 'ETH', szDecimals: 4, maxLeverage: 50 },
        ],
      },
      [
        {
          funding: '0.00012',
          openInterest: '120500',
          prevDayPx: '92000',
          dayNtlVlm: '850000000',
          markPx: '94200.5',
          oraclePx: '94195.0',
        },
        {
          funding: '-0.00005',
          openInterest: '450000',
          prevDayPx: '3100',
          dayNtlVlm: '320000000',
          markPx: '3250.0',
          oraclePx: '3248.5',
        },
      ],
    ];

    const client = new HyperliquidInfoClient();
    vi.spyOn(client as any, 'post').mockResolvedValue(mockMetaAndCtxs);

    const snapshots = await client.getMetaAndAssetCtxs();
    expect(snapshots).toHaveLength(2);

    expect(snapshots[0].asset).toBe('BTC');
    expect(snapshots[0].markPrice).toBe(94200.5);
    expect(snapshots[0].oraclePrice).toBe(94195.0);
    expect(snapshots[0].openInterest).toBe(120500 * 94200.5); // USD Notional: 11,351,160,250
    expect(snapshots[0].fundingRate).toBe(0.00012);
    expect(snapshots[0].source).toBe('hyperliquid:metaAndAssetCtxs');

    expect(snapshots[1].asset).toBe('ETH');
    expect(snapshots[1].markPrice).toBe(3250.0);
  });

  it('should parse clearinghouse state into VerifiedWalletObservation with correct whale tier', async () => {
    const mockClearinghouse = {
      assetPositions: [
        {
          position: {
            coin: 'BTC',
            szi: '150.0',
            entryPx: '90000.0',
            liquidationPx: '75000.0',
            leverage: { type: 'cross', value: 10 },
            unrealizedPnl: '630000.0',
          },
        },
      ],
      marginSummary: {
        accountValue: '14500000.0',
        totalNtlPos: '13500000.0',
        totalRawUsd: '1000000.0',
        totalMarginUsed: '1350000.0',
      },
    };

    const client = new HyperliquidInfoClient();
    vi.spyOn(client as any, 'post').mockResolvedValue(mockClearinghouse);

    const obs = await client.getClearinghouseState('0x1234567890abcdef1234567890abcdef12345678');
    expect(obs).not.toBeNull();
    expect(obs?.walletAddress).toBe('0x1234567890abcdef1234567890abcdef12345678');
    expect(obs?.totalNotionalExposure).toBe(150 * 90000); // 13,500,000
    expect(obs?.whaleClass).toBe('ORCA'); // $5M - $20M is ORCA
    expect(obs?.positions[0].asset).toBe('BTC');
    expect(obs?.positions[0].side).toBe('LONG');
    expect(obs?.positions[0].size).toBe(150);
  });

  it('should track truthful connection health states in WebSocket client', () => {
    const wsClient = new HyperliquidWsClient();
    const initialHealth = wsClient.getHealth();
    expect(initialHealth.status).toBe('CONNECTING');
    expect(initialHealth.lastMessageTimestamp).toBeNull();
  });
});
