'use client';

import React, { useState, useEffect } from 'react';
import { X, Copy, Check, ExternalLink, ShieldCheck, Waves } from 'lucide-react';
import { WhaleDnaCard } from './WhaleDnaCard';
import { WhaleTrailsTimeline } from './WhaleTrailsTimeline';
import { formatNotional } from '@/analytics/what-changed';
import { useTranslation } from '@/i18n';

interface WhaleProfileModalProps {
  address: string | null;
  onClose: () => void;
}

export function WhaleProfileModal({ address, onClose }: WhaleProfileModalProps) {
  const { t, language } = useTranslation();
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!address) {
      setProfile(null);
      return;
    }

    setLoading(true);
    fetch(`/api/whales/${address}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setProfile(data);
        setLoading(false);
      })
      .catch(() => {
        setProfile(null);
        setLoading(false);
      });
  }, [address]);

  if (!address) return null;

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-ocean-deep border border-ocean-border rounded-xl p-6 shadow-2xl text-ocean-text">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-ocean-muted hover:text-ocean-text hover:bg-ocean-surface transition-colors"
          aria-label="Close profile"
        >
          <X className="w-5 h-5" />
        </button>

        {loading ? (
          <div className="py-16 text-center text-xs font-mono text-ocean-muted animate-pulse">
            {address} {t.whales.modalLoading}
          </div>
        ) : profile ? (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-ocean-border">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold uppercase bg-ocean-surface border border-ocean-cyan text-ocean-cyan">
                    {profile.whaleClass}
                  </span>
                  <span className="text-xs font-mono text-ocean-muted">
                    {t.ocean.totalExposure}: <strong className="text-ocean-text font-mono">${formatNotional(profile.totalObservedExposure)}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <span className="font-mono text-sm sm:text-base font-bold text-ocean-text break-all">
                    {profile.address}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="p-1 rounded bg-ocean-surface border border-ocean-border text-ocean-muted hover:text-ocean-cyan transition-colors"
                    title={t.whales.modalCopyAddress}
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-ocean-green" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="text-right text-[11px] font-mono text-ocean-muted">
                <div>{t.whales.modalFirstObserved} {new Date(profile.firstObservedAt).toLocaleDateString()}</div>
                <div>{t.whales.modalLastObserved} {new Date(profile.lastObservedAt).toLocaleTimeString()}</div>
              </div>
            </div>

            {/* Active Positions Table */}
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-ocean-cyan mb-2">
                <span className="flex items-center gap-1.5">
                  <Waves className="w-4 h-4" />
                  {t.whales.modalActivePositions} ({profile.positions?.length || 0})
                </span>
                <span className="text-[10px] text-ocean-muted">{t.whales.modalSource}</span>
              </div>

              {profile.positions && profile.positions.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-ocean-border/60">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-ocean-surface text-ocean-muted text-[11px] border-b border-ocean-border/60">
                      <tr>
                        <th className="p-2.5">{t.common.asset}</th>
                        <th className="p-2.5">{t.common.side}</th>
                        <th className="p-2.5">{t.common.size}</th>
                        <th className="p-2.5">{t.sonar.colEntry}</th>
                        <th className="p-2.5">{t.graveyard.liquidationPrice}</th>
                        <th className="p-2.5">{t.common.leverage}</th>
                        <th className="p-2.5 text-right">{t.helm.unrealizedPnl}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ocean-border/30 bg-ocean-deep/40">
                      {profile.positions.map((pos: any, idx: number) => (
                        <tr key={`${pos.asset}-${idx}`} className="hover:bg-ocean-surface/40">
                          <td className="p-2.5 font-bold text-ocean-text">{pos.asset}</td>
                          <td className="p-2.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                pos.side === 'LONG'
                                    ? 'bg-emerald-950/60 text-ocean-green border border-ocean-green/30'
                                    : 'bg-red-950/60 text-ocean-red border border-ocean-red/30'
                              }`}
                            >
                              {pos.side}
                            </span>
                          </td>
                          <td className="p-2.5 text-ocean-text">{pos.size}</td>
                          <td className="p-2.5 text-ocean-muted">${pos.entryPrice.toLocaleString()}</td>
                          <td className="p-2.5 text-ocean-muted">
                            {pos.liquidationPrice ? `$${pos.liquidationPrice.toLocaleString()}` : 'N/A'}
                          </td>
                          <td className="p-2.5 text-ocean-muted">{pos.leverage}x</td>
                          <td className={`p-2.5 text-right font-bold ${pos.unrealizedPnl >= 0 ? 'text-ocean-green' : 'text-ocean-red'}`}>
                            {pos.unrealizedPnl >= 0 ? '+' : ''}${formatNotional(pos.unrealizedPnl)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-ocean-surface border border-ocean-border/40 text-center text-xs text-ocean-muted">
                  {t.whales.modalNoPositions}
                </div>
              )}
            </div>

            {/* Whale DNA */}
            {profile.dna && <WhaleDnaCard dna={profile.dna} />}

            {/* Whale Trails */}
            <WhaleTrailsTimeline events={profile.events || []} />

            {/* Disclaimer */}
            <div className="p-3 rounded-lg bg-ocean-surface/60 border border-ocean-border/40 text-[10px] font-mono text-ocean-muted flex items-start gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-ocean-cyan shrink-0 mt-0.5" />
              <span>
                {t.whales.modalDisclaimer}
              </span>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-ocean-muted">
            {t.whales.modalNotFound}
          </div>
        )}
      </div>
    </div>
  );
}
