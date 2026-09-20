'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi } from 'lightweight-charts';
import { TrendingUp, BarChart2 } from 'lucide-react';
import { VerifiedMarketSnapshot } from '@/types/contracts';
import { useTranslation } from '@/i18n';

interface MarketChartProps {
  asset: string;
  history?: VerifiedMarketSnapshot[];
  initialCandles?: Array<{ time: number; close: number }>;
  currentPrice?: number;
}

export function MarketChart({ asset, history = [], initialCandles = [], currentPrice }: MarketChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const [dataPointsCount, setDataPointsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#090E17' },
        textColor: '#7D8B99',
      },
      grid: {
        vertLines: { color: 'rgba(25, 38, 62, 0.4)' },
        horzLines: { color: 'rgba(25, 38, 62, 0.4)' },
      },
      crosshair: {
        vertLine: { color: '#00E5FF', width: 1, style: 3 },
        horzLine: { color: '#00E5FF', width: 1, style: 3 },
      },
      timeScale: {
        borderColor: '#19263E',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#19263E',
      },
      height: 300,
    });

    const areaSeries = chart.addAreaSeries({
      lineColor: '#00E5FF',
      topColor: 'rgba(0, 229, 255, 0.25)',
      bottomColor: 'rgba(0, 229, 255, 0.0)',
      lineWidth: 2,
    });

    chartRef.current = chart;
    seriesRef.current = areaSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      if (!seriesRef.current) return;
      setIsLoading(true);

      // 1. If explicit snapshot history passed, use it
      if (history.length > 1) {
        const formatted = history
          .map((h) => ({
            time: Math.floor(h.observedTimestamp / 1000) as any,
            value: h.markPrice,
          }))
          .sort((a, b) => (a.time as number) - (b.time as number));

        const uniqueData: any[] = [];
        let lastTime = 0;
        for (const pt of formatted) {
          if (pt.time > lastTime) {
            uniqueData.push(pt);
            lastTime = pt.time;
          }
        }

        if (uniqueData.length > 1) {
          seriesRef.current.setData(uniqueData);
          setDataPointsCount(uniqueData.length);
          chartRef.current?.timeScale().fitContent();
          setIsLoading(false);
          return;
        }
      }

      // 2. If pre-loaded candles exist, render immediately
      if (initialCandles && initialCandles.length > 1) {
        const points = initialCandles.map((c) => ({
          time: c.time as any,
          value: c.close,
        }));
        seriesRef.current.setData(points);
        setDataPointsCount(points.length);
        chartRef.current?.timeScale().fitContent();
        setIsLoading(false);
        return;
      }

      // 3. Otherwise fetch real Hyperliquid 24h candles from API
      try {
        const res = await fetch(`/api/candles?coin=${encodeURIComponent(asset)}&interval=1h`);
        if (res.ok) {
          const json = await res.json();
          if (!isCancelled && Array.isArray(json.candles) && json.candles.length > 1) {
            const points = json.candles.map((c: any) => ({
              time: c.time as any,
              value: c.close,
            }));
            seriesRef.current.setData(points);
            setDataPointsCount(points.length);
            chartRef.current?.timeScale().fitContent();
            setIsLoading(false);
            return;
          }
        }
      } catch {
        // Fallback to currentPrice if candle fetch fails
      }

      // 4. Fallback if no history could be retrieved
      if (!isCancelled) {
        if (currentPrice) {
          const now = Math.floor(Date.now() / 1000) as any;
          seriesRef.current.setData([{ time: now, value: currentPrice }]);
          setDataPointsCount(1);
        }
        setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [asset, history, initialCandles]);

  // Live price tick update
  useEffect(() => {
    if (!seriesRef.current || !currentPrice || dataPointsCount <= 0) return;
    try {
      const now = Math.floor(Date.now() / 1000) as any;
      seriesRef.current.update({ time: now, value: currentPrice });
    } catch {}
  }, [currentPrice]);

  const { t } = useTranslation();

  return (
    <div className="p-6 rounded-xl bg-ocean-surface border border-ocean-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-ocean-cyan" />
          <h3 className="text-xs font-mono font-bold tracking-wider text-ocean-text">
            {asset} &bull; {t.ocean.chartTitle}
          </h3>
        </div>

        <div className="text-xs font-mono text-ocean-muted flex items-center gap-3">
          {currentPrice && (
            <span className="text-ocean-cyan font-bold">
              ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
            </span>
          )}
          <span className="text-[10px] text-ocean-muted/60">
            {dataPointsCount > 1 ? `${dataPointsCount} ${t.ocean.chartObservations}` : t.ocean.chartCollecting}
          </span>
        </div>
      </div>

      <div ref={chartContainerRef} className="w-full rounded-lg overflow-hidden border border-ocean-border/40" />

      <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-ocean-muted">
        <span>{t.ocean.chartSource}</span>
        <span>{t.ocean.chartZeroSynthetic}</span>
      </div>
    </div>
  );
}
