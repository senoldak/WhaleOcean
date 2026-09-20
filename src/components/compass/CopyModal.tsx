'use client';

import React, { useState } from 'react';
import { WalletAlphaScore } from '@/types/contracts';
import { X, ShieldAlert, CheckCircle2, Zap } from 'lucide-react';
import { AlphaScoreBadge } from '../common/AlphaScoreBadge';
import { PersonaBadge } from '../common/PersonaBadge';
import { useTranslation } from '@/i18n';

interface CopyModalProps {
  score: WalletAlphaScore | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CopyModal({ score, isOpen, onClose, onSuccess }: CopyModalProps) {
  const { t, language } = useTranslation();
  const [allocatedUsd, setAllocatedUsd] = useState(10000);
  const [multiplier, setMultiplier] = useState(1.0);
  const [maxDrawdownLimit, setMaxDrawdownLimit] = useState(15);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen || !score) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/paper/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SUBSCRIBE',
          walletAddress: score.address,
          allocatedUsd,
          multiplier,
          maxDrawdownLimit: maxDrawdownLimit / 100,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || (language === 'tr' ? 'Balina kopyalama aboneliği başlatılamadı' : 'Failed to subscribe to whale copy'));
      }

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err: any) {
      setError(err.message || (language === 'tr' ? 'Kopyalama yapılandırma hatası' : 'Error configuring copy subscription'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ocean-abyss/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-xl border border-ocean-border bg-ocean-surface p-6 shadow-2xl space-y-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-ocean-muted hover:text-ocean-text transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-ocean-cyan" />
            <h2 className="text-lg font-bold tracking-wide text-ocean-text">
              {t.compass.copyModalTitle}
            </h2>
          </div>
          <p className="text-xs text-ocean-muted mt-1 font-mono">
            {t.compass.copyModalDesc}
          </p>
        </div>

        {/* Whale Overview */}
        <div className="rounded-lg border border-ocean-border/60 bg-ocean-abyss/50 p-3.5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-mono text-ocean-muted block">{t.common.address}:</span>
            <span className="text-xs font-mono text-ocean-cyan font-semibold">
              {score.address.slice(0, 10)}...{score.address.slice(-8)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <PersonaBadge persona={score.persona} size="sm" />
            <AlphaScoreBadge score={score.oceanAlphaScore} size="sm" />
          </div>
        </div>

        {isSuccess ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
            <p className="text-sm font-bold text-emerald-400">{t.compass.copySuccess}</p>
            <p className="text-xs text-ocean-muted">
              {language === 'tr'
                ? `Balina HELM güvertesine $${allocatedUsd.toLocaleString()} sanal tahsisle bağlandı.`
                : `Whale mirrored in HELM deck with $${allocatedUsd.toLocaleString()} allocation.`}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 font-mono">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Allocated Capital Slider / Input */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <label className="text-ocean-muted">{t.compass.copyAllocation}:</label>
                <span className="text-ocean-cyan font-bold">${allocatedUsd.toLocaleString()} USDC</span>
              </div>
              <input
                type="range"
                min="1000"
                max="50000"
                step="1000"
                value={allocatedUsd}
                onChange={(e) => setAllocatedUsd(Number(e.target.value))}
                className="w-full accent-ocean-cyan cursor-pointer"
              />
              <span className="text-[10px] text-ocean-muted font-mono">{t.compass.copyAllocationDesc}</span>
            </div>

            {/* Copy Multiplier */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-mono text-ocean-muted block">{t.compass.copyMultiplier}:</label>
                <select
                  value={multiplier}
                  onChange={(e) => setMultiplier(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-md border border-ocean-border bg-ocean-abyss text-xs font-mono text-ocean-text focus:outline-none focus:border-ocean-cyan"
                >
                  <option value={0.5}>0.5x ({language === 'tr' ? 'Korumacı' : 'Conservative'})</option>
                  <option value={1.0}>1.0x ({language === 'tr' ? 'Orantılı' : 'Proportional'})</option>
                  <option value={1.5}>1.5x ({language === 'tr' ? 'Yüksek' : 'Enhanced'})</option>
                  <option value={2.0}>2.0x ({language === 'tr' ? 'Agresif' : 'Aggressive'})</option>
                </select>
              </div>

              {/* Drawdown Circuit Breaker */}
              <div className="space-y-1">
                <label className="text-xs font-mono text-ocean-muted block">{t.compass.circuitBreakerNotice}:</label>
                <select
                  value={maxDrawdownLimit}
                  onChange={(e) => setMaxDrawdownLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-md border border-ocean-border bg-ocean-abyss text-xs font-mono text-ocean-text focus:outline-none focus:border-ocean-cyan"
                >
                  <option value={10}>%10 Devre Kesici</option>
                  <option value={15}>%15 Devre Kesici (Standart)</option>
                  <option value={20}>%20 Devre Kesici</option>
                  <option value={30}>%30 Geniş Tolerans</option>
                </select>
              </div>
            </div>

            {/* Note on zero fake data */}
            <div className="p-2.5 rounded-md bg-ocean-abyss/40 border border-ocean-border/40 text-[11px] text-ocean-muted font-mono leading-relaxed">
              &bull; {t.compass.circuitBreakerDesc}
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-md border border-ocean-border text-xs font-mono text-ocean-muted hover:text-ocean-text hover:bg-ocean-abyss/50 transition-colors"
              >
                {t.common.cancel}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 rounded-md bg-ocean-cyan text-ocean-abyss font-mono text-xs font-bold hover:bg-ocean-cyan/90 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? t.common.loading : t.compass.startCopy}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
