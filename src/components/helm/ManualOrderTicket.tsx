'use client';

import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Crosshair, DollarSign, Sliders } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface ManualOrderTicketProps {
  currentPrice: number;
  selectedAsset?: string;
  onOrderSubmit: (order: {
    asset: string;
    side: 'LONG' | 'SHORT';
    notional: number;
    leverage: number;
    currentMarketPrice: number;
    takeProfit?: number;
    stopLoss?: number;
  }) => void;
  isSubmitting?: boolean;
}

export function ManualOrderTicket({
  currentPrice = 90000,
  selectedAsset = 'BTC',
  onOrderSubmit,
  isSubmitting = false,
}: ManualOrderTicketProps) {
  const { t, language } = useTranslation();
  const [asset, setAsset] = useState(selectedAsset);
  const [side, setSide] = useState<'LONG' | 'SHORT'>('LONG');
  const [notional, setNotional] = useState(10000);
  const [leverage, setLeverage] = useState(5);
  const [takeProfit, setTakeProfit] = useState<string>('');
  const [stopLoss, setStopLoss] = useState<string>('');

  const requiredMargin = notional / leverage;
  const estFee = notional * 0.00035;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onOrderSubmit({
      asset,
      side,
      notional,
      leverage,
      currentMarketPrice: currentPrice,
      takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
      stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
    });
  };

  return (
    <div className="rounded-xl border border-ocean-border/70 bg-ocean-surface/60 p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-ocean-border/40 pb-3">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-ocean-cyan" />
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-ocean-text">
            {t.helm.orderTicketTitle}
          </h3>
        </div>
        <div className="text-xs font-mono text-ocean-muted">
          {t.helm.mark} <strong className="text-ocean-cyan">${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
        {/* Asset Selector */}
        <div className="space-y-1">
          <label className="text-ocean-muted block uppercase text-[10px]">{t.helm.tradingPair}</label>
          <select
            value={asset}
            onChange={(e) => setAsset(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-ocean-border bg-ocean-abyss text-ocean-text focus:outline-none focus:border-ocean-cyan"
          >
            <option value="BTC">BTC / USD Perpetual</option>
            <option value="ETH">ETH / USD Perpetual</option>
            <option value="SOL">SOL / USD Perpetual</option>
            <option value="HYPE">HYPE / USD Perpetual</option>
          </select>
        </div>

        {/* Direction Switcher (Long / Short) */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSide('LONG')}
            className={`py-2.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
              side === 'LONG'
                ? 'bg-emerald-500 text-ocean-abyss shadow-md shadow-emerald-500/20'
                : 'border border-ocean-border/60 text-emerald-400 hover:bg-emerald-500/10'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>LONG</span>
          </button>
          <button
            type="button"
            onClick={() => setSide('SHORT')}
            className={`py-2.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
              side === 'SHORT'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'border border-ocean-border/60 text-rose-400 hover:bg-rose-500/10'
            }`}
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>SHORT</span>
          </button>
        </div>

        {/* Notional Size Input */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <label className="text-ocean-muted block uppercase text-[10px]">{t.helm.orderNotional}:</label>
            <span className="text-ocean-cyan">${notional.toLocaleString('en-US')}</span>
          </div>
          <input
            type="number"
            min="500"
            step="500"
            value={notional}
            onChange={(e) => setNotional(Math.max(100, Number(e.target.value)))}
            className="w-full px-3 py-2 rounded-lg border border-ocean-border bg-ocean-abyss text-ocean-text focus:outline-none focus:border-ocean-cyan"
          />
        </div>

        {/* Leverage Slider */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <label className="text-ocean-muted block uppercase text-[10px]">{t.helm.orderLeverage} ({leverage}x):</label>
            <span className="text-ocean-muted">{t.helm.marginRequired}: <strong className="text-ocean-text">${Math.round(requiredMargin).toLocaleString('en-US')}</strong></span>
          </div>
          <input
            type="range"
            min="1"
            max="50"
            step="1"
            value={leverage}
            onChange={(e) => setLeverage(Number(e.target.value))}
            className="w-full accent-ocean-cyan cursor-pointer"
          />
        </div>

        {/* TP / SL Inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-ocean-muted block uppercase text-[10px]">{t.helm.takeProfitPrice}:</label>
            <input
              type="number"
              placeholder={language === 'tr' ? 'İsteğe Bağlı' : 'Optional'}
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-ocean-border bg-ocean-abyss text-ocean-text placeholder:text-ocean-muted/50 focus:outline-none focus:border-ocean-cyan"
            />
          </div>
          <div className="space-y-1">
            <label className="text-ocean-muted block uppercase text-[10px]">{t.helm.stopLossPrice}:</label>
            <input
              type="number"
              placeholder={language === 'tr' ? 'İsteğe Bağlı' : 'Optional'}
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-ocean-border bg-ocean-abyss text-ocean-text placeholder:text-ocean-muted/50 focus:outline-none focus:border-ocean-cyan"
            />
          </div>
        </div>

        {/* Execution Preview */}
        <div className="p-2.5 rounded-lg bg-ocean-abyss/40 border border-ocean-border/40 text-[11px] text-ocean-muted space-y-1">
          <div className="flex justify-between">
            <span>{t.helm.estFee}</span>
            <span className="text-ocean-text">${estFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>{t.helm.slippageProtection}</span>
            <span className="text-emerald-400">5 bps</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-3 rounded-lg font-bold transition-all shadow-md ${
            side === 'LONG'
              ? 'bg-emerald-500 hover:bg-emerald-600 text-ocean-abyss shadow-emerald-500/20'
              : 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20'
          } disabled:opacity-50`}
        >
          {isSubmitting ? t.helm.placingOrder : `${t.helm.placeOrder} (${side} ${asset})`}
        </button>
      </form>
    </div>
  );
}
