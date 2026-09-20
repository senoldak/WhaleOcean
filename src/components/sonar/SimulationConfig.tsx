'use client';

import React from 'react';
import { BacktestParams } from '@/types/contracts';
import { Sliders, Play, Waves, ShieldCheck, Activity } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface SimulationConfigProps {
  params: BacktestParams;
  onChange: (updated: Partial<BacktestParams>) => void;
  onRun: () => void;
  isLoading: boolean;
}

export function SimulationConfig({ params, onChange, onRun, isLoading }: SimulationConfigProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border border-ocean-border/70 bg-ocean-surface/60 p-5 space-y-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-ocean-border/40 pb-3">
        <Sliders className="w-4 h-4 text-ocean-cyan" />
        <h3 className="font-mono text-xs font-bold tracking-wider uppercase text-ocean-text">
          {t.sonar.setupHeader}
        </h3>
      </div>

      {/* Mode Switcher */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-mono text-ocean-muted block uppercase">{t.sonar.mode}:</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onChange({ mode: 'WHALE_REPLICATION' })}
            className={`px-3 py-2 rounded-lg text-xs font-mono font-medium transition-colors ${
              params.mode === 'WHALE_REPLICATION'
                ? 'bg-ocean-cyan text-ocean-abyss font-bold shadow-sm'
                : 'border border-ocean-border/60 text-ocean-muted hover:text-ocean-text hover:bg-ocean-surface'
            }`}
          >
            {t.sonar.whaleReplication}
          </button>
          <button
            type="button"
            onClick={() => onChange({ mode: 'OCEAN_RULE_STRATEGY' })}
            className={`px-3 py-2 rounded-lg text-xs font-mono font-medium transition-colors ${
              params.mode === 'OCEAN_RULE_STRATEGY'
                ? 'bg-ocean-cyan text-ocean-abyss font-bold shadow-sm'
                : 'border border-ocean-border/60 text-ocean-muted hover:text-ocean-text hover:bg-ocean-surface'
            }`}
          >
            {t.sonar.oceanRule}
          </button>
        </div>
      </div>

      {/* Conditional Inputs */}
      {params.mode === 'WHALE_REPLICATION' ? (
        <div className="space-y-2">
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-ocean-muted block uppercase">{t.sonar.targetWallet}:</label>
            <input
              type="text"
              placeholder={t.sonar.walletPlaceholder}
              value={params.targetWallet || ''}
              onChange={(e) => onChange({ targetWallet: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-ocean-border bg-ocean-abyss text-xs font-mono text-ocean-text placeholder:text-ocean-muted/50 focus:outline-none focus:border-ocean-cyan"
            />
          </div>

          <div className="space-y-1 pt-1">
            <span className="text-[10px] font-mono text-ocean-muted uppercase block">
              {t.sonar.quickWhalesLabel}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'BlueWhale (0x546b)', addr: '0x546b5a34da4e0f498c4d1264c8d927d6d337dcb9' },
                { label: 'MegaLong (0x9ac4)', addr: '0x9ac47ba2705e46be76e068c2ee032223ec8fc898' },
                { label: 'HypeScalper (0x1f8b)', addr: '0x1f8be357e93910398f6d8fb9279a0b0d3e5a40a2' },
              ].map(w => (
                <button
                  key={w.addr}
                  type="button"
                  onClick={() => onChange({ targetWallet: w.addr })}
                  className={`px-2 py-1 rounded text-[10px] font-mono transition-colors border ${
                    params.targetWallet?.toLowerCase() === w.addr.toLowerCase()
                      ? 'bg-ocean-cyan/20 border-ocean-cyan text-ocean-cyan font-bold'
                      : 'border-ocean-border/60 bg-ocean-abyss/60 text-ocean-muted hover:text-ocean-text hover:border-ocean-border'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-ocean-muted block uppercase">
              {t.sonar.strategyPresetLabel}
            </label>
            <select
              value={params.strategyRule?.strategyPreset || 'TREND_FOLLOWING'}
              onChange={(e) =>
                onChange({
                  strategyRule: {
                    ...params.strategyRule,
                    strategyPreset: e.target.value as any,
                  },
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-ocean-border bg-ocean-abyss text-xs font-mono text-ocean-text focus:outline-none focus:border-ocean-cyan"
            >
              <option value="TREND_FOLLOWING">{t.sonar.presetTrend}</option>
              <option value="MEAN_REVERSION">{t.sonar.presetMeanReversion}</option>
              <option value="BREAKOUT_MOMENTUM">{t.sonar.presetBreakout}</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-ocean-muted block uppercase">{t.sonar.takeProfit}</label>
              <input
                type="number"
                step="0.5"
                value={params.strategyRule?.takeProfitPct ?? 3.0}
                onChange={(e) =>
                  onChange({
                    strategyRule: {
                      ...params.strategyRule,
                      takeProfitPct: parseFloat(e.target.value) || 3.0,
                    },
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-ocean-border bg-ocean-abyss text-xs font-mono text-ocean-text focus:outline-none focus:border-ocean-cyan"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-ocean-muted block uppercase">{t.sonar.stopLoss}</label>
              <input
                type="number"
                step="0.5"
                value={params.strategyRule?.stopLossPct ?? 1.5}
                onChange={(e) =>
                  onChange({
                    strategyRule: {
                      ...params.strategyRule,
                      stopLossPct: parseFloat(e.target.value) || 1.5,
                    },
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-ocean-border bg-ocean-abyss text-xs font-mono text-ocean-text focus:outline-none focus:border-ocean-cyan"
              />
            </div>
          </div>
        </div>
      )}

      {/* Asset & Resolution */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono text-ocean-muted block uppercase">{t.sonar.asset}:</label>
          <select
            value={params.asset || 'BTC'}
            onChange={(e) => onChange({ asset: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-ocean-border bg-ocean-abyss text-xs font-mono text-ocean-text focus:outline-none focus:border-ocean-cyan"
          >
            <option value="BTC">BTC (Bitcoin)</option>
            <option value="ETH">ETH (Ethereum)</option>
            <option value="SOL">SOL (Solana)</option>
            <option value="HYPE">HYPE (Hyperliquid)</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-mono text-ocean-muted block uppercase">{t.sonar.candleResolution}:</label>
          <select
            value={params.candleInterval || '1h'}
            onChange={(e) => onChange({ candleInterval: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-ocean-border bg-ocean-abyss text-xs font-mono text-ocean-text focus:outline-none focus:border-ocean-cyan"
          >
            <option value="15m">15m Bars</option>
            <option value="1h">1h Bars</option>
            <option value="4h">4h Bars</option>
            <option value="1d">1d Bars</option>
          </select>
        </div>
      </div>

      {/* Capital & Leverage */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[11px] font-mono text-ocean-muted block uppercase">{t.sonar.simCapital}:</label>
          <input
            type="number"
            step="5000"
            value={params.initialCapital || 100000}
            onChange={(e) => onChange({ initialCapital: Number(e.target.value) })}
            className="w-full px-3 py-2 rounded-lg border border-ocean-border bg-ocean-abyss text-xs font-mono text-ocean-text focus:outline-none focus:border-ocean-cyan"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-mono text-ocean-muted block uppercase">{t.sonar.leverage}:</label>
          <select
            value={params.leverage || 2}
            onChange={(e) => onChange({ leverage: Number(e.target.value) })}
            className="w-full px-3 py-2 rounded-lg border border-ocean-border bg-ocean-abyss text-xs font-mono text-ocean-text focus:outline-none focus:border-ocean-cyan"
          >
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={3}>3x</option>
            <option value={5}>5x</option>
            <option value={10}>10x</option>
          </select>
        </div>
      </div>

      {/* Realistic Market Friction Parameters */}
      <div className="space-y-2 pt-2 border-t border-ocean-border/40">
        <span className="text-[11px] font-mono text-ocean-muted uppercase block font-semibold">
          {t.sonar.realismControls}
        </span>

        <div className="space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between text-ocean-muted">
            <span>{t.sonar.takerFeeNotice}</span>
            <span className="text-ocean-cyan">{t.sonar.exchangeStandard}</span>
          </div>

          <div className="flex items-center justify-between text-ocean-muted">
            <span>{t.sonar.dynamicSlippage}</span>
            <span className="text-ocean-cyan">{params.slippageBps ?? 5} bps (0.05%)</span>
          </div>

          <div className="flex items-center justify-between text-ocean-muted">
            <span>{t.sonar.fundingDeduction}</span>
            <span className="text-emerald-400 font-bold">{t.sonar.statusActive}</span>
          </div>
        </div>
      </div>

      {/* Run Action */}
      <button
        onClick={onRun}
        disabled={isLoading}
        className="w-full py-3 rounded-lg bg-ocean-cyan text-ocean-abyss font-mono text-xs font-bold hover:bg-ocean-cyan/90 transition-colors flex items-center justify-center gap-2 shadow-md shadow-ocean-cyan/20 disabled:opacity-50"
      >
        <Play className="w-4 h-4 fill-current" />
        <span>{isLoading ? t.sonar.running : t.sonar.runSimulation}</span>
      </button>
    </div>
  );
}
