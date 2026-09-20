import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SimulationConfig } from '../src/components/sonar/SimulationConfig';
import { EquityCurveChart } from '../src/components/sonar/EquityCurveChart';
import { TradeLogTable } from '../src/components/sonar/TradeLogTable';
import { SonarWorkspace } from '../src/components/sonar/SonarWorkspace';
import { BacktestResult } from '../src/types/contracts';

describe('SONAR Backtest Laboratory Components', () => {
  const mockResult: BacktestResult = {
    params: {
      mode: 'WHALE_REPLICATION',
      targetWallet: '0x1234567890123456789012345678901234567890',
      asset: 'BTC',
      initialCapital: 100000,
      leverage: 2,
    },
    summary: {
      initialCapital: 100000,
      finalEquity: 124500,
      totalReturnUsd: 24500,
      totalReturnPct: 24.5,
      benchmarkBtcReturnPct: 12.0,
      sharpeRatio: 2.15,
      sortinoRatio: 2.95,
      maxDrawdownPct: 8.5,
      profitFactor: 2.2,
      winRatePct: 62.5,
      totalTrades: 16,
      winningTrades: 10,
      losingTrades: 6,
      totalFeesPaid: 215,
      totalFundingPaid: 45,
      expectancyUsd: 1531,
      avgHoldingTimeHours: 18.2,
    },
    equityCurve: [
      { timestamp: 1700000000000, equity: 100000, benchmarkEquity: 100000, drawdownPct: 0 },
      { timestamp: 1700010000000, equity: 110000, benchmarkEquity: 104000, drawdownPct: 0 },
      { timestamp: 1700020000000, equity: 106000, benchmarkEquity: 102000, drawdownPct: 3.6 },
      { timestamp: 1700030000000, equity: 124500, benchmarkEquity: 112000, drawdownPct: 0 },
    ],
    trades: [
      {
        id: 'trade_1',
        asset: 'BTC',
        side: 'LONG',
        entryTime: 1700000000000,
        exitTime: 1700010000000,
        entryPrice: 90000,
        exitPrice: 94500,
        size: 2.0,
        notional: 189000,
        feePaid: 66.15,
        fundingPaid: 0,
        pnl: 8933.85,
        pnlPercent: 8.9,
        exitReason: 'WHALE_CLOSED',
      },
    ],
  };

  it('should render SimulationConfig form with controls for mode, fees, and leverage in Turkish default', () => {
    const html = renderToStaticMarkup(
      <SimulationConfig
        params={mockResult.params}
        onChange={() => {}}
        onRun={() => {}}
        isLoading={false}
      />
    );

    expect(html).toContain('SİMÜLASYON KURULUMU');
    expect(html).toContain('Balina Kopyalama');
    expect(html).toContain('Okyanus Kural Stratejisi');
    expect(html).toContain('Taker Komisyonu (%0.035):');
    expect(html).toContain('Dinamik Fiyat Kayması:');
    expect(html).toContain('Kantitatif Simülasyonu Başlat');
  });

  it('should render EquityCurveChart with SVG curve elements and benchmark in Turkish default', () => {
    const html = renderToStaticMarkup(
      <EquityCurveChart
        equityCurve={mockResult.equityCurve}
        initialCapital={100000}
      />
    );

    expect(html).toContain('<svg');
    expect(html).toContain('Strateji Özkaynağı');
    expect(html).toContain('BTC Al-Tut Getirisi');
    expect(html).toContain('$124,500');
  });

  it('should render TradeLogTable with executed trades and PnL badges in Turkish default', () => {
    const html = renderToStaticMarkup(
      <TradeLogTable trades={mockResult.trades} />
    );

    expect(html).toContain('BTC');
    expect(html).toContain('LONG');
    expect(html).toContain('90,000');
    expect(html).toContain('94,500');
    expect(html).toContain('+$8,933.85');
    expect(html).toContain('WHALE_CLOSED');
    expect(html).toContain('Gerçekleşen İşlem Günlüğü');
  });

  it('should render SonarWorkspace with 3 navigation tabs for Lab, Multi-Horizon, and Correlation', () => {
    const html = renderToStaticMarkup(<SonarWorkspace />);

    expect(html).toContain('SONAR LAB');
    expect(html).toContain('SİMÜLATÖR');
    expect(html).toContain('ÇOKLU VADE');
    expect(html).toContain('KORELASYON');
  });
});
