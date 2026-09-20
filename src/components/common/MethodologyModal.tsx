'use client';

import React from 'react';
import { X, ShieldCheck, Database, Waves, Compass } from 'lucide-react';
import { WHALE_TIER_THRESHOLDS } from '@/types/contracts';
import { useTranslation } from '@/i18n';

interface MethodologyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MethodologyModal({ isOpen, onClose }: MethodologyModalProps) {
  const { t, language } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-ocean-deep border border-ocean-border rounded-xl p-6 shadow-2xl text-ocean-text">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-ocean-muted hover:text-ocean-text hover:bg-ocean-surface transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-ocean-border">
          <div className="p-2 rounded-lg bg-ocean-surface border border-ocean-border text-ocean-cyan">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-ocean-text">
              {t.methodology.title}
            </h2>
            <p className="text-xs text-ocean-muted">
              {t.methodology.subtitle}
            </p>
          </div>
        </div>

        <div className="space-y-6 text-xs text-ocean-text/90 leading-relaxed">
          {/* Section 1: Zero Fake Data */}
          <div className="p-4 rounded-lg bg-ocean-surface border border-ocean-border">
            <div className="flex items-center gap-2 mb-2 font-medium text-ocean-green">
              <ShieldCheck className="w-4 h-4" />
              <span>{t.methodology.zeroFakeTitle}</span>
            </div>
            <p className="text-ocean-muted">
              {t.methodology.zeroFakeDesc}
            </p>
          </div>

          {/* Section 2: Data Sources */}
          <div>
            <div className="flex items-center gap-2 mb-2 font-medium text-ocean-cyan text-sm">
              <Database className="w-4 h-4" />
              <span>{language === 'tr' ? 'Doğrulanmış Veri Soyağacı & Kaynaklar' : 'Verified Data Lineage & Sources'}</span>
            </div>
            <ul className="space-y-2 list-disc list-inside text-ocean-muted pl-1">
              <li>
                <strong className="text-ocean-text">{language === 'tr' ? 'Piyasa Meta Verisi & Anlık Görüntüler:' : 'Market Metadata & Snapshots:'}</strong> Hyperliquid Info API (<code className="text-ocean-cyan">metaAndAssetCtxs</code>) {language === 'tr' ? 'her 10 saniyede bir sorgulanır.' : 'polled every 10s.'}
              </li>
              <li>
                <strong className="text-ocean-text">{language === 'tr' ? 'Gerçek Zamanlı Fiyatlar:' : 'Real-Time Prices:'}</strong> {language === 'tr' ? 'Resmi WebSocket' : 'Official WebSocket'} (<code className="text-ocean-cyan">wss://api.hyperliquid.xyz/ws</code>) <code className="text-ocean-cyan">allMids</code> {language === 'tr' ? 'akışına bağlıdır.' : 'subscribed.'}
              </li>
              <li>
                <strong className="text-ocean-text">{language === 'tr' ? 'Balina Evreni Tohumlama:' : 'Whale Universe Seeding:'}</strong> {language === 'tr' ? 'Hyperliquid Liderlik Tablosu' : 'Hyperliquid Leaderboard'} (<code className="text-ocean-cyan">leaderboard</code>) {language === 'tr' ? 've canlı büyük işlem emirleri (> $100k) birleştirilir.' : 'combined with real-time large trade executions (> $100k notional).'}
              </li>
              <li>
                <strong className="text-ocean-text">{language === 'tr' ? 'Pozisyonlar & Kaldıraç:' : 'Positions & Leverage:'}</strong> {language === 'tr' ? 'Resmi takas odası hesap durumları' : 'Official clearinghouse account states'} (<code className="text-ocean-cyan">clearinghouseState</code>).
              </li>
            </ul>
          </div>

          {/* Section 3: Whale Classification */}
          <div>
            <div className="flex items-center gap-2 mb-2 font-medium text-ocean-cyan text-sm">
              <Waves className="w-4 h-4" />
              <span>{language === 'tr' ? 'Balina Sınıflandırma Katmanları' : 'Whale Classification Tiers'}</span>
            </div>
            <p className="text-ocean-muted mb-3">
              {language === 'tr'
                ? 'Katmanlar, yalnızca gözlemlenen toplam nominal pozisyon büyüklüğüne dayalı şeffaf kantitatif aralıklardır. Ne içeriden bilgi ne de işlem yeteneği ima eder:'
                : 'Tiers are transparent quantitative brackets based strictly on total observed notional exposure. They imply neither insider status nor trading skill:'}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
              {Object.entries(WHALE_TIER_THRESHOLDS).map(([tier, bounds]) => (
                <div key={tier} className="p-2 rounded bg-ocean-surface border border-ocean-border">
                  <div className="text-ocean-cyan font-bold">{tier}</div>
                  <div className="text-ocean-muted">
                    {bounds.max === Infinity
                      ? `> $${bounds.min / 1_000_000}M`
                      : `$${bounds.min >= 1_000_000 ? `${bounds.min / 1_000_000}M` : `${bounds.min / 1000}k`} - $${bounds.max >= 1_000_000 ? `${bounds.max / 1_000_000}M` : `${bounds.max / 1000}k`}`}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Ocean Conditions */}
          <div>
            <h3 className="font-medium text-ocean-cyan text-sm mb-2">{t.methodology.oceanCondTitle}</h3>
            <p className="text-ocean-muted">
              {t.methodology.oceanCondDesc}
              <br />
              <strong className="text-ocean-text">{language === 'tr' ? 'Sınıflandırmalar:' : 'Classifications:'}</strong> {language === 'tr' ? 'SAKİN (0–25), AKTİF (26–55), HUZURSUZ (56–75), FIRTINA (76–100).' : 'CALM (0–25), ACTIVE (26–55), RESTLESS (56–75), STORM (76–100).'}
              <br />
              <em className="text-amber-400">
                {language === 'tr'
                  ? 'Önemli: Okyanus Koşulları yalnızca mevcut piyasa iklimini açıklar ve asla yönsel bir al-sat sinyali değildir.'
                  : 'Important: Ocean Conditions describe current market climate only and are never directional trading signals.'}
              </em>
            </p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-ocean-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-ocean-cyan text-ocean-abyss font-semibold text-xs hover:bg-ocean-cyan/90 transition-colors"
          >
            {language === 'tr' ? 'Anladım ve Kapat' : 'Acknowledge & Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
