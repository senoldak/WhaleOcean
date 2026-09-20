'use client';

import React, { useMemo } from 'react';
import { TrendingUp, ShieldAlert, LineChart } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface EquityCurvePoint {
  timestamp: number;
  equity: number;
  benchmarkEquity: number;
  drawdownPct: number;
}

interface EquityCurveChartProps {
  equityCurve: EquityCurvePoint[];
  initialCapital?: number;
}

export function EquityCurveChart({ equityCurve, initialCapital = 100000 }: EquityCurveChartProps) {
  const { t } = useTranslation();

  if (!equityCurve || equityCurve.length === 0) {
    return (
      <div className="rounded-xl border border-ocean-border/60 bg-ocean-surface/40 p-12 text-center text-xs font-mono text-ocean-muted">
        {t.sonar.emptyCurve}
      </div>
    );
  }

  const { minEq, maxEq, pointsStrategy, pointsBenchmark, lastEquity, lastBenchmark } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;

    for (const p of equityCurve) {
      if (p.equity < min) min = p.equity;
      if (p.benchmarkEquity < min) min = p.benchmarkEquity;
      if (p.equity > max) max = p.equity;
      if (p.benchmarkEquity > max) max = p.benchmarkEquity;
    }

    // Safety bounds
    min = Math.floor(Math.min(min * 0.95, initialCapital * 0.9));
    max = Math.ceil(Math.max(max * 1.05, initialCapital * 1.1));

    const range = max - min || 1;
    const width = 800;
    const height = 280;

    const stratCoords: string[] = [];
    const benchCoords: string[] = [];

    equityCurve.forEach((p, idx) => {
      const x = (idx / (equityCurve.length - 1 || 1)) * width;
      const yStrat = height - ((p.equity - min) / range) * height;
      const yBench = height - ((p.benchmarkEquity - min) / range) * height;

      stratCoords.push(`${x.toFixed(1)},${yStrat.toFixed(1)}`);
      benchCoords.push(`${x.toFixed(1)},${yBench.toFixed(1)}`);
    });

    return {
      minEq: min,
      maxEq: max,
      pointsStrategy: stratCoords.join(' '),
      pointsBenchmark: benchCoords.join(' '),
      lastEquity: equityCurve[equityCurve.length - 1]?.equity ?? initialCapital,
      lastBenchmark: equityCurve[equityCurve.length - 1]?.benchmarkEquity ?? initialCapital,
    };
  }, [equityCurve, initialCapital]);

  const isNetPositive = lastEquity >= initialCapital;

  return (
    <div className="rounded-xl border border-ocean-border/70 bg-ocean-surface/60 p-5 space-y-4 shadow-sm">
      {/* Header & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ocean-border/40 pb-3">
        <div className="flex items-center gap-2">
          <LineChart className="w-4 h-4 text-ocean-cyan" />
          <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-ocean-text">
            {t.sonar.equityCurveTitle}
          </h4>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-ocean-cyan rounded-full inline-block"></span>
            <span className="text-ocean-text">{t.sonar.strategyEquity}: </span>
            <strong className={isNetPositive ? 'text-emerald-400' : 'text-rose-400'}>
              ${Math.round(lastEquity).toLocaleString('en-US')}
            </strong>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-ocean-muted border-dashed border-b border-ocean-muted inline-block"></span>
            <span className="text-ocean-muted">{t.sonar.btcBenchmark}: </span>
            <strong className="text-ocean-text">
              ${Math.round(lastBenchmark).toLocaleString('en-US')}
            </strong>
          </div>
        </div>
      </div>

      {/* SVG Chart Container */}
      <div className="relative w-full h-[280px] overflow-hidden">
        <svg
          viewBox="0 0 800 280"
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          {/* Horizontal Grid lines */}
          <line x1="0" y1="0" x2="800" y2="0" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
          <line x1="0" y1="70" x2="800" y2="70" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
          <line x1="0" y1="140" x2="800" y2="140" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
          <line x1="0" y1="210" x2="800" y2="210" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
          <line x1="0" y1="280" x2="800" y2="280" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />

          {/* Benchmark Line (Gray/Muted) */}
          <polyline
            fill="none"
            stroke="#64748b"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            points={pointsBenchmark}
          />

          {/* Strategy Line (Cyan Glowing) */}
          <polyline
            fill="none"
            stroke="#00f0ff"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={pointsStrategy}
          />
        </svg>
      </div>

      {/* Footer Range Labels */}
      <div className="flex justify-between text-[10px] font-mono text-ocean-muted pt-1">
        <span>Min: ${minEq.toLocaleString('en-US')}</span>
        <span>Baseline: ${initialCapital.toLocaleString('en-US')}</span>
        <span>Max: ${maxEq.toLocaleString('en-US')}</span>
      </div>
    </div>
  );
}
