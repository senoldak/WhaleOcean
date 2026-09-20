'use client';

import React from 'react';
import { X, Star, Trash2, ExternalLink, Waves } from 'lucide-react';
import { useWatchlist } from '@/services/useWatchlist';
import { useTranslation } from '@/i18n';
import Link from 'next/link';

interface WatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectWallet?: (address: string) => void;
}

export function WatchlistModal({ isOpen, onClose, onSelectWallet }: WatchlistModalProps) {
  const { watchlist, removeWallet, clearAll } = useWatchlist();
  const { t, language } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ocean-abyss/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-ocean-surface border border-ocean-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-ocean-border flex items-center justify-between bg-ocean-deep/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-ocean-cyan/10 border border-ocean-cyan/20 text-ocean-cyan">
              <Star className="w-4 h-4 fill-ocean-cyan/40" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ocean-text tracking-wide flex items-center gap-2">
                {t.watchlist.title}
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-ocean-cyan/10 text-ocean-cyan border border-ocean-cyan/30">
                  {watchlist.length}
                </span>
              </h2>
              <p className="text-[11px] text-ocean-muted font-mono">{t.watchlist.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-ocean-muted hover:text-ocean-text hover:bg-ocean-surface/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2">
          {watchlist.length === 0 ? (
            <div className="text-center py-10 px-4">
              <div className="w-12 h-12 rounded-full bg-ocean-deep border border-ocean-border flex items-center justify-center mx-auto mb-3 text-ocean-muted">
                <Star className="w-5 h-5 opacity-40" />
              </div>
              <h3 className="text-xs font-semibold text-ocean-text mb-1">{t.watchlist.emptyTitle}</h3>
              <p className="text-[11px] text-ocean-muted max-w-xs mx-auto leading-relaxed">
                {t.watchlist.emptyDesc}
              </p>
            </div>
          ) : (
            watchlist.map((item) => (
              <div
                key={item.address}
                className="flex items-center justify-between p-3 rounded-lg border border-ocean-border/60 bg-ocean-deep/40 hover:bg-ocean-deep hover:border-ocean-cyan/40 transition-colors group"
              >
                <div
                  className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                  onClick={() => {
                    if (onSelectWallet) {
                      onSelectWallet(item.address);
                      onClose();
                    }
                  }}
                >
                  <Waves className="w-4 h-4 text-ocean-cyan shrink-0" />
                  <div className="truncate">
                    <span className="text-xs font-mono font-medium text-ocean-text group-hover:text-ocean-cyan transition-colors">
                      {item.address.slice(0, 10)}...{item.address.slice(-8)}
                    </span>
                    {item.whaleClass && (
                      <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-ocean-surface border border-ocean-border text-ocean-muted">
                        {item.whaleClass}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <Link
                    href={`/whales?inspect=${item.address}`}
                    onClick={onClose}
                    className="p-1.5 rounded-md text-ocean-muted hover:text-ocean-cyan hover:bg-ocean-surface transition-colors"
                    title={language === 'tr' ? 'Detayları İncele' : 'Inspect Details'}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    onClick={() => removeWallet(item.address)}
                    className="p-1.5 rounded-md text-ocean-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title={t.watchlist.removeSuccess}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {watchlist.length > 0 && (
          <div className="p-3 border-t border-ocean-border/60 bg-ocean-deep/40 flex items-center justify-between text-xs font-mono">
            <span className="text-ocean-muted text-[11px]">
              {t.watchlist.totalTracked}: {watchlist.length}
            </span>
            <button
              onClick={clearAll}
              className="text-[11px] text-red-400/80 hover:text-red-400 hover:underline transition-colors"
            >
              {t.watchlist.clearAll}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
