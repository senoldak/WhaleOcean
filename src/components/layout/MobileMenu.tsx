'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, ExternalLink, Waves, Compass, Activity, Radio, Target, Layers, Skull, BarChart3, TrendingUp, Anchor, BookOpen, Star, Sparkles } from 'lucide-react';
import { useTranslation, Translations } from '@/i18n';

interface NavItem {
  key: keyof Translations['nav'];
  name: string;
  href: string;
  enabled: boolean;
  category: string;
}

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenMethodology: () => void;
  onOpenWatchlist: () => void;
  onOpenTour: () => void;
  items: NavItem[];
}

export function MobileMenu({
  isOpen,
  onClose,
  onOpenMethodology,
  onOpenWatchlist,
  onOpenTour,
  items,
}: MobileMenuProps) {
  const pathname = usePathname();
  const { t, language, setLanguage } = useTranslation();

  if (!isOpen) return null;

  // Group items by category for cleaner mobile UX
  const categories = [
    { id: 'overview', title: language === 'tr' ? 'Genel Bakış' : 'Overview' },
    { id: 'intel', title: language === 'tr' ? 'İstihbarat & Radar' : 'Intelligence & Radar' },
    { id: 'network', title: language === 'tr' ? 'Ağ & Sermaye Akışı' : 'Network & Flow' },
    { id: 'markets', title: language === 'tr' ? 'Piyasalar & Risk' : 'Markets & Risk' },
  ];

  return (
    <div className="fixed inset-0 z-50 lg:hidden flex flex-col bg-ocean-abyss/95 backdrop-blur-xl animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="h-16 px-4 border-b border-ocean-border flex items-center justify-between">
        <Link href="/" onClick={onClose} className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-ocean-cyan to-ocean-blue flex items-center justify-center text-ocean-abyss shadow-md">
            <Waves className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold tracking-wider text-sm text-ocean-text">WHALE OCEAN</span>
            <span className="text-[10px] text-ocean-muted font-mono">{t.nav.tagline}</span>
          </div>
        </Link>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-ocean-muted hover:text-ocean-text bg-ocean-surface/60 border border-ocean-border"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Action Bar (Watchlist, Tour, Language) */}
      <div className="p-3 border-b border-ocean-border bg-ocean-surface/40 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              onClose();
              onOpenWatchlist();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ocean-border bg-ocean-surface text-xs font-mono text-ocean-cyan"
          >
            <Star className="w-3.5 h-3.5 fill-ocean-cyan/30" />
            <span>{t.watchlist.title}</span>
          </button>
          <button
            onClick={() => {
              onClose();
              onOpenTour();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-ocean-border bg-ocean-surface text-xs font-mono text-ocean-muted hover:text-ocean-text"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">{t.onboarding.openTour}</span>
          </button>
        </div>

        {/* Language selector */}
        <div className="flex items-center rounded-lg border border-ocean-border bg-ocean-surface p-0.5 text-xs font-mono">
          <button
            type="button"
            onClick={() => setLanguage('tr')}
            className={`px-2 py-1 rounded ${
              language === 'tr' ? 'bg-ocean-cyan/20 text-ocean-cyan font-bold' : 'text-ocean-muted'
            }`}
          >
            TR
          </button>
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`px-2 py-1 rounded ${
              language === 'en' ? 'bg-ocean-cyan/20 text-ocean-cyan font-bold' : 'text-ocean-muted'
            }`}
          >
            EN
          </button>
        </div>
      </div>

      {/* Navigation Links Grid */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {items.map((item) => {
            const isActive = pathname === item.href;
            const label = (t.nav[item.key] as string) || item.name;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={`flex flex-col p-3 rounded-xl border transition-all ${
                  isActive
                    ? 'bg-ocean-surface border-ocean-cyan text-ocean-cyan font-bold shadow-sm'
                    : 'bg-ocean-surface/60 border-ocean-border/80 text-ocean-muted hover:text-ocean-text hover:bg-ocean-surface'
                }`}
              >
                <span className="text-xs font-mono tracking-wider">{label}</span>
                <span className="text-[10px] text-ocean-muted/70 font-mono mt-0.5 truncate">
                  {item.category}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Footer methodology button */}
      <div className="p-4 border-t border-ocean-border bg-ocean-surface/60 flex items-center justify-between">
        <button
          onClick={() => {
            onClose();
            onOpenMethodology();
          }}
          className="flex items-center gap-2 text-xs font-mono text-ocean-muted hover:text-ocean-cyan"
        >
          <BookOpen className="w-4 h-4" />
          <span>{t.nav.methodology}</span>
        </button>
        <span className="text-[10px] font-mono text-ocean-muted">Hyperliquid L1</span>
      </div>
    </div>
  );
}
