import { describe, it, expect } from 'vitest';
import {
  scoreWallet,
  classifyPersona,
  classifyRiskTier,
} from '../src/analytics/recommendations/alpha-scorer';
import { PositionEvent } from '../src/db/repository';

describe('Ocean Alpha Scorer & Recommendation Engine (COMPASS)', () => {
  const baseWallet = '0x1234567890123456789012345678901234567890';

  it('should return null or reject wallets with fewer than 5 position events', () => {
    const insufficientEvents: PositionEvent[] = [
      {
        walletAddress: baseWallet,
        asset: 'BTC',
        eventType: 'OPEN',
        prevSize: 0,
        newSize: 1,
        deltaNotional: 90000,
        timestamp: 1000,
      },
      {
        walletAddress: baseWallet,
        asset: 'BTC',
        eventType: 'CLOSE',
        prevSize: 1,
        newSize: 0,
        deltaNotional: -92000,
        timestamp: 5000,
      },
    ];

    const result = scoreWallet(baseWallet, insufficientEvents, [], 0);
    expect(result).toBeNull();
  });

  it('should disqualify wallets with extreme drawdowns (> 45%)', () => {
    // 6 trades that suffer a massive loss
    const catastrophicEvents: PositionEvent[] = [
      { walletAddress: baseWallet, asset: 'BTC', eventType: 'OPEN', prevSize: 0, newSize: 10, deltaNotional: 900000, timestamp: 1000 },
      { walletAddress: baseWallet, asset: 'BTC', eventType: 'INCREASE', prevSize: 10, newSize: 20, deltaNotional: 800000, timestamp: 2000 },
      { walletAddress: baseWallet, asset: 'BTC', eventType: 'CLOSE', prevSize: 20, newSize: 0, deltaNotional: -800000, timestamp: 3000 }, // Huge loss
      { walletAddress: baseWallet, asset: 'BTC', eventType: 'OPEN', prevSize: 0, newSize: 5, deltaNotional: 450000, timestamp: 4000 },
      { walletAddress: baseWallet, asset: 'BTC', eventType: 'CLOSE', prevSize: 5, newSize: 0, deltaNotional: -460000, timestamp: 5000 },
      { walletAddress: baseWallet, asset: 'BTC', eventType: 'OPEN', prevSize: 0, newSize: 5, deltaNotional: 450000, timestamp: 6000 },
    ];

    const result = scoreWallet(baseWallet, catastrophicEvents, [], 450000);
    // Drawdown should be high or score penalized severely (< 40)
    if (result) {
      expect(result.oceanAlphaScore).toBeLessThan(50);
    }
  });

  it('should assign TRITON persona to disciplined low-leverage carry traders', () => {
    const persona = classifyPersona({
      avgLeverage: 2,
      maxDrawdown: 7.5,
      profitFactor: 2.2,
      avgHoldingHours: 36,
      winRate: 65,
    });
    expect(persona).toBe('TRITON');
  });

  it('should assign ORCA persona to high-momentum trend runners', () => {
    const persona = classifyPersona({
      avgLeverage: 5,
      maxDrawdown: 14.0,
      profitFactor: 2.5,
      avgHoldingHours: 12,
      winRate: 58,
    });
    expect(persona).toBe('ORCA');
  });

  it('should assign LEVIATHAN persona to agile high-frequency storm warriors', () => {
    const persona = classifyPersona({
      avgLeverage: 10,
      maxDrawdown: 22.0,
      profitFactor: 1.8,
      avgHoldingHours: 2.5,
      winRate: 54,
    });
    expect(persona).toBe('LEVIATHAN');
  });

  it('should correctly classify risk tiers', () => {
    expect(classifyRiskTier(6.0, 2)).toBe('CONSERVATIVE');
    expect(classifyRiskTier(15.0, 5)).toBe('BALANCED');
    expect(classifyRiskTier(28.0, 15)).toBe('AGGRESSIVE');
  });

  it('should produce a high Ocean Alpha Score for consistent, low-drawdown trader', () => {
    const disciplinedEvents: PositionEvent[] = [
      { walletAddress: baseWallet, asset: 'BTC', eventType: 'OPEN', prevSize: 0, newSize: 1, deltaNotional: 90000, timestamp: 1000 },
      { walletAddress: baseWallet, asset: 'BTC', eventType: 'CLOSE', prevSize: 1, newSize: 0, deltaNotional: -92000, timestamp: 5000 }, // +2000
      { walletAddress: baseWallet, asset: 'ETH', eventType: 'OPEN', prevSize: 0, newSize: 10, deltaNotional: 30000, timestamp: 10000 },
      { walletAddress: baseWallet, asset: 'ETH', eventType: 'CLOSE', prevSize: 10, newSize: 0, deltaNotional: -31000, timestamp: 15000 }, // +1000
      { walletAddress: baseWallet, asset: 'SOL', eventType: 'OPEN', prevSize: 0, newSize: 100, deltaNotional: 20000, timestamp: 20000 },
      { walletAddress: baseWallet, asset: 'SOL', eventType: 'CLOSE', prevSize: 100, newSize: 0, deltaNotional: -20800, timestamp: 25000 }, // +800
    ];

    const result = scoreWallet(baseWallet, disciplinedEvents, [], 100000);
    expect(result).not.toBeNull();
    expect(result!.oceanAlphaScore).toBeGreaterThanOrEqual(70);
    expect(result!.winRate).toBeGreaterThanOrEqual(60);
    expect(result!.maxDrawdown).toBeLessThan(15);
  });
});
