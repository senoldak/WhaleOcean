'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Compass, Waves, Activity, Radio, Target, Layers, Skull, BarChart3, TrendingUp, Anchor, X, ArrowRight } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavCommand {
  id: string;
  title: string;
  category: 'pages' | 'actions';
  icon: React.ReactNode;
  href: string;
  keywords?: string[];
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { t, language } = useTranslation();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const pages: NavCommand[] = [
    {
      id: 'ocean',
      title: t.nav.ocean,
      category: 'pages',
      icon: <Waves className="w-4 h-4 text-ocean-cyan" />,
      href: '/',
      keywords: ['home', 'ana sayfa', 'deck', 'dashboard'],
    },
    {
      id: 'whales',
      title: t.nav.whales,
      category: 'pages',
      icon: <Anchor className="w-4 h-4 text-ocean-blue" />,
      href: '/whales',
      keywords: ['wallets', 'cüzdanlar', 'dna', 'pozisyonlar', 'positions'],
    },
    {
      id: 'compass',
      title: t.nav.compass,
      category: 'pages',
      icon: <Compass className="w-4 h-4 text-emerald-400" />,
      href: '/compass',
      keywords: ['radar', 'alpha', 'score', 'puan', 'ranking'],
    },
    {
      id: 'sonar',
      title: t.nav.sonar,
      category: 'pages',
      icon: <Radio className="w-4 h-4 text-cyan-400" />,
      href: '/sonar',
      keywords: ['anomalies', 'anomali', 'spikes', 'hacim'],
    },
    {
      id: 'helm',
      title: t.nav.helm,
      category: 'pages',
      icon: <Activity className="w-4 h-4 text-purple-400" />,
      href: '/helm',
      keywords: ['paper', 'copy', 'simulator', 'simülasyon'],
    },
    {
      id: 'pods',
      title: t.nav.pods,
      category: 'pages',
      icon: <Layers className="w-4 h-4 text-blue-400" />,
      href: '/pods',
      keywords: ['sürü', 'clusters', 'küme', 'network'],
    },
    {
      id: 'hunt',
      title: t.nav.hunt,
      category: 'pages',
      icon: <Target className="w-4 h-4 text-amber-400" />,
      href: '/hunt',
      keywords: ['av', 'signals', 'alert', 'avcı'],
    },
    {
      id: 'trails',
      title: t.nav.trails,
      category: 'pages',
      icon: <TrendingUp className="w-4 h-4 text-emerald-400" />,
      href: '/trails',
      keywords: ['timeline', 'izler', 'history', 'geçmiş'],
    },
    {
      id: 'reef',
      title: t.nav.reef,
      category: 'pages',
      icon: <Waves className="w-4 h-4 text-teal-400" />,
      href: '/reef',
      keywords: ['depth', 'orderbook', 'derinlik', 'resif'],
    },
    {
      id: 'migration',
      title: t.nav.migration,
      category: 'pages',
      icon: <TrendingUp className="w-4 h-4 text-indigo-400" />,
      href: '/migration',
      keywords: ['sermaye göçü', 'capital', 'flow', 'akış'],
    },
    {
      id: 'markets',
      title: t.nav.markets,
      category: 'pages',
      icon: <BarChart3 className="w-4 h-4 text-ocean-cyan" />,
      href: '/markets',
      keywords: ['fiyat', 'prices', 'open interest', 'fonlama', 'funding'],
    },
    {
      id: 'graveyard',
      title: t.nav.graveyard,
      category: 'pages',
      icon: <Skull className="w-4 h-4 text-red-400" />,
      href: '/graveyard',
      keywords: ['rekt', 'liquidations', 'tasfiye', 'mezarlık'],
    },
  ];

  // Quick crypto tickers for fast jump
  const quickAssets = ['BTC', 'ETH', 'SOL', 'HYPE', 'ARB', 'AVAX', 'SUI', 'DOGE', 'OP', 'LINK'].map((coin) => ({
    id: `market-${coin}`,
    title: `${coin} Perp Market`,
    category: 'actions' as const,
    icon: <BarChart3 className="w-4 h-4 text-ocean-cyan" />,
    href: `/markets?asset=${coin}`,
    keywords: [coin.toLowerCase(), 'market', 'parite', 'chart'],
  }));

  const allItems = [...pages, ...quickAssets];

  const filteredItems = allItems.filter((item) => {
    if (!query.trim()) return item.category === 'pages';
    const q = query.toLowerCase().trim();
    return (
      item.title.toLowerCase().includes(q) ||
      (item.keywords && item.keywords.some((k) => k.toLowerCase().includes(q)))
    );
  });

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredItems[selectedIndex];
      if (selected) {
        router.push(selected.href);
        onClose();
      } else if (query.startsWith('0x') && query.length > 10) {
        // Direct jump to wallet
        router.push(`/whales?inspect=${query.trim()}`);
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-ocean-abyss/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-ocean-surface border border-ocean-border rounded-xl shadow-2xl overflow-hidden flex flex-col font-mono"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Bar */}
        <div className="flex items-center px-4 py-3 border-b border-ocean-border bg-ocean-deep/70">
          <Search className="w-5 h-5 text-ocean-cyan shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.search.placeholder}
            className="w-full bg-transparent text-sm text-ocean-text placeholder:text-ocean-muted/60 focus:outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded text-ocean-muted hover:text-ocean-text"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <span className="text-[10px] px-1.5 py-0.5 rounded border border-ocean-border text-ocean-muted bg-ocean-surface">
              ESC
            </span>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {query.startsWith('0x') && query.length > 10 && (
            <div
              onClick={() => {
                router.push(`/whales?inspect=${query.trim()}`);
                onClose();
              }}
              className="flex items-center justify-between p-2.5 rounded-lg border border-ocean-cyan/40 bg-ocean-cyan/10 cursor-pointer text-xs text-ocean-cyan font-bold"
            >
              <span className="truncate">
                {language === 'tr' ? 'Cüzdan İncele:' : 'Inspect Wallet:'} {query}
              </span>
              <ArrowRight className="w-4 h-4 shrink-0 ml-2" />
            </div>
          )}

          {filteredItems.length === 0 && (!query.startsWith('0x') || query.length <= 10) ? (
            <div className="text-center py-8 text-xs text-ocean-muted">
              {t.search.noResults}
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    router.push(item.href);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-ocean-cyan/20 text-ocean-cyan border border-ocean-cyan/30'
                      : 'text-ocean-text hover:bg-ocean-deep/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="shrink-0">{item.icon}</span>
                    <span className="font-semibold">{item.title}</span>
                  </div>
                  <span className="text-[10px] text-ocean-muted">
                    {item.category === 'pages' ? t.search.pages : t.search.actions}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 border-t border-ocean-border bg-ocean-deep/50 flex items-center justify-between text-[11px] text-ocean-muted">
          <span>{t.search.hint}</span>
          <span className="text-[10px] text-ocean-cyan">Whale Ocean Command</span>
        </div>
      </div>
    </div>
  );
}
