'use client';

import React, { useState, useEffect } from 'react';
import { BacktestParams, BacktestResult } from '@/types/contracts';
import { SimulationConfig } from './SimulationConfig';
import { EquityCurveChart } from './EquityCurveChart';
import { TradeLogTable } from './TradeLogTable';
import { MultiHorizonMatrix } from './MultiHorizonMatrix';
import { CorrelationHeatmap } from './CorrelationHeatmap';
import { Activity, ShieldAlert, FlaskConical, BarChart3, Radio } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface SonarWorkspaceProps {
  initialWallet?: string;
  initialAsset?: string;
}

type SonarTab = 'SIMULATOR' | 'MULTI_HORIZON' | 'CORRELATION';

export function SonarWorkspace({ initialWallet, initialAsset }: SonarWorkspaceProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<SonarTab>('SIMULATOR');

  const [params, setParams] = useState<BacktestParams>({
    mode: initialWallet ? 'WHALE_REPLICATION' : 'OCEAN_RULE_STRATEGY',
    targetWallet: initialWallet || '',
    asset: initialAsset || 'BTC',
    candleInterval: '1h',
    initialCapital: 100000,
    leverage: 2,
    takerFeePct: 0.00035,
    slippageBps: 5,
    deductFunding: true,
    strategyRule: {
      takeProfitPct: 3.0,
      stopLossPct: 1.5,
    },
  });

  const [result, setResult] = useState<BacktestResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleRunSimulation = async (customParams?: BacktestParams) => {
    setIsLoading(true);
    setError(null);

    const runParams = customParams || params;

    try {
      const res = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(runParams),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Simulation execution failed');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Error running backtest');
    } finally {
      setIsLoading(false);
    }
  };

  // Run automatically on first load
  useEffect(() => {
    handleRunSimulation();
  }, []);

  const handleInspectWallet = (address: string) => {
    const updated: BacktestParams = {
      ...params,
      mode: 'WHALE_REPLICATION',
      targetWallet: address,
    };
    setParams(updated);
    setActiveTab('SIMULATOR');
    handleRunSimulation(updated);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-ocean-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-ocean-cyan" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ocean-text">
              SONAR LAB
            </h1>
          </div>
          <p className="text-xs text-ocean-muted mt-1 font-mono">
            {t.sonar.title.toUpperCase()} &bull; {t.sonar.subtitle}
          </p>
        </div>

        <div className="text-xs font-mono text-ocean-muted">
          <span>{t.sonar.simulationEngine} </span>
          <strong className="text-ocean-cyan font-bold">{t.sonar.engineDesc}</strong>
        </div>
      </div>

      {/* Top 3 Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-ocean-border/40 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('SIMULATOR')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap ${
            activeTab === 'SIMULATOR'
              ? 'bg-ocean-surface text-ocean-cyan border border-ocean-cyan/40 shadow-sm shadow-ocean-cyan/10'
              : 'text-ocean-muted hover:text-ocean-text hover:bg-ocean-surface/40'
          }`}
        >
          <FlaskConical className="w-4 h-4" />
          <span>{t.sonar.tabSimulator}</span>
        </button>

        <button
          onClick={() => setActiveTab('MULTI_HORIZON')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap ${
            activeTab === 'MULTI_HORIZON'
              ? 'bg-ocean-surface text-ocean-cyan border border-ocean-cyan/40 shadow-sm shadow-ocean-cyan/10'
              : 'text-ocean-muted hover:text-ocean-text hover:bg-ocean-surface/40'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>{t.sonar.tabMultiHorizon}</span>
        </button>

        <button
          onClick={() => setActiveTab('CORRELATION')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap ${
            activeTab === 'CORRELATION'
              ? 'bg-ocean-surface text-ocean-cyan border border-ocean-cyan/40 shadow-sm shadow-ocean-cyan/10'
              : 'text-ocean-muted hover:text-ocean-text hover:bg-ocean-surface/40'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>{t.sonar.tabCorrelation}</span>
        </button>
      </div>

      {error && activeTab === 'SIMULATOR' && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tab 1: Simulator Lab (Existing split view) */}
      {activeTab === 'SIMULATOR' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Config (4 cols) */}
          <div className="lg:col-span-4">
            <SimulationConfig
              params={params}
              onChange={(upd) => setParams((prev) => ({ ...prev, ...upd }))}
              onRun={() => handleRunSimulation()}
              isLoading={isLoading}
            />
          </div>

          {/* Right Column: Performance Deck & Equity Curve (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {result && (
              <>
                {/* Top Key Metrics Ribbon */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Total Return */}
                  <div className="rounded-xl border border-ocean-border/70 bg-ocean-surface/60 p-4 space-y-1">
                    <span className="text-[10px] font-mono text-ocean-muted uppercase block">{t.sonar.statsTotalReturn}</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-lg font-mono font-bold ${result.summary.totalReturnUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {result.summary.totalReturnPct >= 0 ? '+' : ''}{result.summary.totalReturnPct.toFixed(2)}%
                      </span>
                      <span className="text-xs font-mono text-ocean-muted">
                        (${Math.round(result.summary.totalReturnUsd).toLocaleString()})
                      </span>
                    </div>
                  </div>

                  {/* Sharpe & Sortino */}
                  <div className="rounded-xl border border-ocean-border/70 bg-ocean-surface/60 p-4 space-y-1">
                    <span className="text-[10px] font-mono text-ocean-muted uppercase block">{t.sonar.statsSharpe} / {t.sonar.statsSortino}</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-lg font-mono font-bold ${result.summary.sharpeRatio >= 1.8 ? 'text-emerald-400' : 'text-ocean-cyan'}`}>
                        {result.summary.sharpeRatio.toFixed(2)}
                      </span>
                      <span className="text-xs font-mono text-ocean-muted">
                        / {result.summary.sortinoRatio.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Max Drawdown */}
                  <div className="rounded-xl border border-ocean-border/70 bg-ocean-surface/60 p-4 space-y-1">
                    <span className="text-[10px] font-mono text-ocean-muted uppercase block">{t.sonar.statsMaxDrawdown}</span>
                    <span className={`text-lg font-mono font-bold ${result.summary.maxDrawdownPct < 15 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {result.summary.maxDrawdownPct.toFixed(2)}%
                    </span>
                  </div>

                  {/* Win Rate & Profit Factor */}
                  <div className="rounded-xl border border-ocean-border/70 bg-ocean-surface/60 p-4 space-y-1">
                    <span className="text-[10px] font-mono text-ocean-muted uppercase block">{t.sonar.statsWinRate} / {t.sonar.statsProfitFactor}</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-mono font-bold text-ocean-text">
                        {result.summary.winRatePct.toFixed(1)}%
                      </span>
                      <span className="text-xs font-mono text-ocean-cyan">
                        / {result.summary.profitFactor.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Equity Curve SVG Chart */}
                <EquityCurveChart
                  equityCurve={result.equityCurve}
                  initialCapital={result.summary.initialCapital}
                />

                {/* Trade Log Table */}
                <TradeLogTable trades={result.trades} />
              </>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Multi-Horizon Matrix */}
      {activeTab === 'MULTI_HORIZON' && (
        <MultiHorizonMatrix onInspectWallet={handleInspectWallet} />
      )}

      {/* Tab 3: Correlation Radar & Heatmap */}
      {activeTab === 'CORRELATION' && (
        <CorrelationHeatmap onInspectWallet={handleInspectWallet} />
      )}
    </div>
  );
}
