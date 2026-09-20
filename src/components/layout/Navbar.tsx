'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectionBadge } from './ConnectionBadge';
import { MethodologyModal } from '../common/MethodologyModal';
import { CommandPalette } from '../common/CommandPalette';
import { WatchlistModal } from '../common/WatchlistModal';
import { OnboardingTour } from '../common/OnboardingTour';
import { MobileMenu } from './MobileMenu';
import { ConnectionHealth } from '@/types/contracts';
import { useWatchlist } from '@/services/useWatchlist';
import {
  Waves,
  BookOpen,
  Search,
  Star,
  Sparkles,
  Menu,
  ChevronDown,
  Anchor,
  Compass,
  Radio,
  Activity,
  Layers,
  Target,
  TrendingUp,
  BarChart3,
  Skull,
  LayoutGrid,
  ArrowRight,
  X,
  Flame,
} from 'lucide-react';
import { useTranslation, Translations } from '@/i18n';

interface NavbarProps {
  health?: ConnectionHealth;
}

interface NavItem {
  key: keyof Translations['nav'];
  name: string;
  href: string;
  enabled: boolean;
  category: string;
}

interface NavModule {
  key: keyof Translations['nav'];
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  descTr: string;
  descEn: string;
  badgeTr?: string;
  badgeEn?: string;
}

interface NavCategory {
  id: 'intel' | 'flow' | 'market';
  titleTr: string;
  titleEn: string;
  taglineTr: string;
  taglineEn: string;
  badgeTr: string;
  badgeEn: string;
  items: NavModule[];
}

const MODULE_CATEGORIES: NavCategory[] = [
  {
    id: 'intel',
    titleTr: 'İstihbarat',
    titleEn: 'Intelligence',
    taglineTr: 'Balina cüzdan analizleri & alfa motorları',
    taglineEn: 'Whale wallet analytics & alpha engines',
    badgeTr: 'Çekirdek Analiz',
    badgeEn: 'Core Analytics',
    items: [
      {
        key: 'whales',
        name: 'WHALES',
        href: '/whales',
        icon: Waves,
        color: 'text-cyan-400 bg-cyan-950/40 border-cyan-500/30',
        descTr: 'Büyük sermaye cüzdanları ve davranışsal DNA',
        descEn: 'Tracked large trader wallets & behavioral DNA',
        badgeTr: 'Çekirdek',
        badgeEn: 'Core',
      },
      {
        key: 'compass',
        name: 'COMPASS',
        href: '/compass',
        icon: Compass,
        color: 'text-purple-400 bg-purple-950/40 border-purple-500/30',
        descTr: 'Alfa sıralaması ve trader risk profillemesi',
        descEn: 'Alpha ranking & trader risk profiling',
        badgeTr: 'Alfa',
        badgeEn: 'Alpha',
      },
      {
        key: 'sonar',
        name: 'SONAR',
        href: '/sonar',
        icon: Radio,
        color: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30',
        descTr: 'Nicel geriye dönük test ve portföy korelasyonu',
        descEn: 'Quantitative backtesting & correlation engine',
        badgeTr: 'Simülatör',
        badgeEn: 'Simulator',
      },
      {
        key: 'helm',
        name: 'HELM',
        href: '/helm',
        icon: Anchor,
        color: 'text-amber-400 bg-amber-950/40 border-amber-500/30',
        descTr: 'Sanal işlem güvertesi ve balina kopyalama',
        descEn: 'Paper execution deck & whale copy trading',
        badgeTr: 'Sanal',
        badgeEn: 'Paper',
      },
      {
        key: 'hunt',
        name: 'HUNT',
        href: '/hunt',
        icon: Target,
        color: 'text-rose-400 bg-rose-950/40 border-rose-500/30',
        descTr: 'Tasfiye avı ve kümelenmiş likidite havuzları',
        descEn: 'Liquidation hunt & clustered squeeze zones',
        badgeTr: 'Risk',
        badgeEn: 'Risk',
      },
    ],
  },
  {
    id: 'flow',
    titleTr: 'Ağ & Akış',
    titleEn: 'Flow & Pods',
    taglineTr: 'Sürü davranışları & sermaye akışları',
    taglineEn: 'Syndicate pods & capital migration',
    badgeTr: 'Dinamik Akış',
    badgeEn: 'Dynamic Flow',
    items: [
      {
        key: 'pods',
        name: 'PODS',
        href: '/pods',
        icon: Layers,
        color: 'text-sky-400 bg-sky-950/40 border-sky-500/30',
        descTr: 'Birlikte hareket eden balina sürüleri ve sendikalar',
        descEn: 'Co-directional whale pods & syndicates',
        badgeTr: 'Sürü',
        badgeEn: 'Pods',
      },
      {
        key: 'trails',
        name: 'TRAILS',
        href: '/trails',
        icon: Activity,
        color: 'text-indigo-400 bg-indigo-950/40 border-indigo-500/30',
        descTr: 'Canlı pozisyon açma/kapama ve dönüş denetimi',
        descEn: 'Live position delta stream & flip audit',
        badgeTr: 'Canlı',
        badgeEn: 'Live',
      },
      {
        key: 'migration',
        name: 'MIGRATION',
        href: '/migration',
        icon: TrendingUp,
        color: 'text-teal-400 bg-teal-950/40 border-teal-500/30',
        descTr: 'Varlıklar arası net sermaye rotasyonu ve akışlar',
        descEn: 'Cross-asset net flow & rotation trends',
        badgeTr: 'Makro',
        badgeEn: 'Macro',
      },
    ],
  },
  {
    id: 'market',
    titleTr: 'Piyasa & Risk',
    titleEn: 'Markets & Risk',
    taglineTr: 'Derinlik bariyerleri & tasfiye radarı',
    taglineEn: 'Depth barriers & liquidation radar',
    badgeTr: 'Piyasa Katmanı',
    badgeEn: 'Market Layer',
    items: [
      {
        key: 'markets',
        name: 'MARKETS',
        href: '/markets',
        icon: BarChart3,
        color: 'text-blue-400 bg-blue-950/40 border-blue-500/30',
        descTr: 'Tüm kalıcı piyasalar, gerçek fiyatlar ve fonlama',
        descEn: 'All perpetual markets, mark prices & funding',
        badgeTr: 'Fiyat',
        badgeEn: 'Prices',
      },
      {
        key: 'reef',
        name: 'REEF',
        href: '/reef',
        icon: Layers,
        color: 'text-cyan-400 bg-cyan-950/40 border-cyan-500/30',
        descTr: 'Açık pozisyon bariyerleri ve yoğunlaşma sağlığı',
        descEn: 'Open interest reefs & barrier health',
        badgeTr: 'Bariyer',
        badgeEn: 'Barriers',
      },
      {
        key: 'graveyard',
        name: 'GRAVEYARD',
        href: '/graveyard',
        icon: Skull,
        color: 'text-red-400 bg-red-950/40 border-red-500/30',
        descTr: 'Zarardaki balina pozisyonları ve tasfiye mezarlığı',
        descEn: 'Distressed whale casualties & mortality radar',
        badgeTr: 'Tasfiye',
        badgeEn: 'Casualties',
      },
    ],
  },
];

const NAV_ITEMS: NavItem[] = [
  { key: 'ocean', name: 'OCEAN', href: '/', enabled: true, category: 'Terminal' },
  ...MODULE_CATEGORIES.flatMap((cat) =>
    cat.items.map((item) => ({
      key: item.key,
      name: item.name,
      href: item.href,
      enabled: true,
      category: cat.titleTr,
    }))
  ),
];

export function Navbar({ health }: NavbarProps) {
  const pathname = usePathname();
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isWatchlistOpen, setIsWatchlistOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modern Mega-Menu State
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const navContainerRef = useRef<HTMLDivElement | null>(null);

  const { t, language, setLanguage } = useTranslation();
  const { watchlist } = useWatchlist();

  // Listen for Ctrl+K or Cmd+K and ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsMegaMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setIsMegaMenuOpen(false);
  }, [pathname]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navContainerRef.current && !navContainerRef.current.contains(e.target as Node)) {
        setIsMegaMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMouseEnterCategory = (catId: string) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setActiveCategory(catId);
    setIsMegaMenuOpen(true);
  };

  const handleMouseLeaveNav = () => {
    closeTimerRef.current = setTimeout(() => {
      setIsMegaMenuOpen(false);
    }, 200);
  };

  const handleMouseEnterMenu = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const toggleCategory = (catId: string) => {
    if (isMegaMenuOpen && activeCategory === catId) {
      setIsMegaMenuOpen(false);
    } else {
      setActiveCategory(catId);
      setIsMegaMenuOpen(true);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-ocean-border bg-ocean-abyss/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Tagline */}
          <div className="flex items-center gap-4 lg:gap-6">
            <Link
              href="/"
              onClick={() => setIsMegaMenuOpen(false)}
              className="flex items-center gap-2.5 group"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-ocean-cyan to-ocean-blue flex items-center justify-center text-ocean-abyss shadow-md shadow-ocean-cyan/20 group-hover:scale-105 transition-transform">
                <Waves className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold tracking-wider text-sm text-ocean-text group-hover:text-ocean-cyan transition-colors">
                  WHALE OCEAN
                </span>
                <span className="text-[10px] text-ocean-muted tracking-tight hidden sm:inline">
                  {t.nav.tagline}
                </span>
              </div>
            </Link>

            {/* Desktop Navigation with Modern Mega-Menu Trigger */}
            <div
              ref={navContainerRef}
              onMouseLeave={handleMouseLeaveNav}
              className="relative hidden xl:block ml-2 pl-4 border-l border-ocean-border"
            >
              <nav className="flex items-center gap-1.5">
                {/* Ocean / Home Direct Tab */}
                <Link
                  href="/"
                  onClick={() => setIsMegaMenuOpen(false)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                    pathname === '/'
                      ? 'bg-ocean-surface text-ocean-cyan border border-ocean-border shadow-xs'
                      : 'text-ocean-muted hover:text-ocean-text hover:bg-ocean-surface/60'
                  }`}
                >
                  <Waves className="w-3.5 h-3.5 text-ocean-cyan" />
                  <span>{t.nav.ocean}</span>
                </Link>

                {/* Category Mega-Menu Triggers */}
                {MODULE_CATEGORIES.map((cat) => {
                  const isCatActive = cat.items.some((i) => pathname === i.href);
                  const isMenuCatOpen = isMegaMenuOpen && activeCategory === cat.id;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onMouseEnter={() => handleMouseEnterCategory(cat.id)}
                      onClick={() => toggleCategory(cat.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                        isCatActive || isMenuCatOpen
                          ? 'bg-ocean-surface text-ocean-cyan border border-ocean-border shadow-xs'
                          : 'text-ocean-muted hover:text-ocean-text hover:bg-ocean-surface/60'
                      }`}
                    >
                      <span>{language === 'tr' ? cat.titleTr : cat.titleEn}</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          isMenuCatOpen ? 'rotate-180 text-ocean-cyan' : 'opacity-60'
                        }`}
                      />
                    </button>
                  );
                })}

                {/* Explore / Bento Overview Button */}
                <button
                  type="button"
                  onMouseEnter={() => handleMouseEnterCategory('all')}
                  onClick={() => toggleCategory('all')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all border ${
                    isMegaMenuOpen && activeCategory === 'all'
                      ? 'bg-ocean-cyan/15 text-ocean-cyan border-ocean-cyan/40 shadow-xs'
                      : 'border-ocean-border/60 text-ocean-muted hover:text-ocean-cyan hover:bg-ocean-surface/60'
                  }`}
                  title={language === 'tr' ? 'Tüm Modüller (Bento Görünüm)' : 'All Modules (Bento View)'}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden 2xl:inline">
                    {language === 'tr' ? 'Keşfet' : 'Explore'}
                  </span>
                </button>
              </nav>

              {/* Modern Bento Mega-Menu Panel */}
              <div
                onMouseEnter={handleMouseEnterMenu}
                className={`absolute left-0 top-full pt-3 w-[920px] transition-all duration-200 ease-out z-50 ${
                  isMegaMenuOpen
                    ? 'opacity-100 visible pointer-events-auto translate-y-0'
                    : 'opacity-0 invisible pointer-events-none -translate-y-2'
                }`}
              >
                <div className="bg-ocean-deep/95 backdrop-blur-2xl border border-ocean-border rounded-2xl shadow-2xl shadow-black/80 ring-1 ring-white/10 overflow-hidden">
                  {/* Top Bar inside Mega-Menu */}
                  <div className="px-5 py-3 border-b border-ocean-border/60 bg-ocean-surface/40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-ocean-cyan animate-pulse" />
                      <span className="text-xs font-mono font-bold tracking-wider text-ocean-text uppercase">
                        {language === 'tr' ? 'Whale Ocean Analitik & Terminal Modülleri' : 'Whale Ocean Analytics & Terminal Modules'}
                      </span>
                      <span className="text-[11px] font-mono text-ocean-muted">
                        (12 {language === 'tr' ? 'canlı modül' : 'live modules'})
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-ocean-muted hidden sm:inline">
                        [ESC] {language === 'tr' ? 'Kapat' : 'Close'}
                      </span>
                      <button
                        onClick={() => setIsMegaMenuOpen(false)}
                        className="p-1 rounded-md text-ocean-muted hover:text-ocean-text hover:bg-ocean-surface transition-colors"
                        aria-label="Close menu"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 3-Column Bento Grid */}
                  <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 bg-gradient-to-b from-ocean-surface/20 to-ocean-abyss/80">
                    {MODULE_CATEGORIES.map((cat) => {
                      const isHighlighted = activeCategory === cat.id || activeCategory === 'all';

                      return (
                        <div
                          key={cat.id}
                          className={`flex flex-col rounded-xl p-3 transition-all duration-200 border ${
                            activeCategory === cat.id
                              ? 'bg-ocean-surface/60 border-ocean-cyan/50 shadow-lg shadow-ocean-cyan/5 ring-1 ring-ocean-cyan/20'
                              : isHighlighted
                              ? 'bg-ocean-surface/30 border-ocean-border/60 hover:border-ocean-border'
                              : 'bg-ocean-surface/10 border-ocean-border/30 opacity-70 hover:opacity-100'
                          }`}
                        >
                          {/* Category Header */}
                          <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-ocean-border/40">
                            <div>
                              <h3 className="text-xs font-mono font-bold text-ocean-text uppercase tracking-wider">
                                {language === 'tr' ? cat.titleTr : cat.titleEn}
                              </h3>
                              <p className="text-[10px] font-mono text-ocean-muted mt-0.5 line-clamp-1">
                                {language === 'tr' ? cat.taglineTr : cat.taglineEn}
                              </p>
                            </div>
                            <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full border border-ocean-border bg-ocean-deep text-ocean-muted">
                              {cat.items.length}
                            </span>
                          </div>

                          {/* Category Items */}
                          <div className="space-y-1.5 flex-1">
                            {cat.items.map((item) => {
                              const isActive = pathname === item.href;
                              const IconComponent = item.icon;

                              return (
                                <Link
                                  key={item.name}
                                  href={item.href}
                                  onClick={() => setIsMegaMenuOpen(false)}
                                  className={`group flex items-start gap-2.5 p-2 rounded-lg transition-all ${
                                    isActive
                                      ? 'bg-ocean-deep border border-ocean-cyan/50 text-ocean-cyan shadow-xs'
                                      : 'hover:bg-ocean-deep/80 text-ocean-muted hover:text-ocean-text border border-transparent'
                                  }`}
                                >
                                  <div className={`p-1.5 rounded-md border shrink-0 transition-transform group-hover:scale-105 ${item.color}`}>
                                    <IconComponent className="w-4 h-4" />
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-1">
                                      <span className={`text-xs font-mono font-bold tracking-wide transition-colors ${
                                        isActive ? 'text-ocean-cyan' : 'text-ocean-text group-hover:text-ocean-cyan'
                                      }`}>
                                        {t.nav[item.key] || item.name}
                                      </span>

                                      {isActive ? (
                                        <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-ocean-cyan bg-ocean-cyan/15 px-1.5 py-0.2 rounded border border-ocean-cyan/30">
                                          <span className="w-1.5 h-1.5 rounded-full bg-ocean-cyan animate-ping" />
                                          {language === 'tr' ? 'Açık' : 'Active'}
                                        </span>
                                      ) : (
                                        <ArrowRight className="w-3 h-3 text-ocean-muted/40 group-hover:text-ocean-cyan group-hover:translate-x-0.5 transition-all opacity-0 group-hover:opacity-100" />
                                      )}
                                    </div>

                                    <p className="text-[10px] font-mono text-ocean-muted leading-tight mt-0.5 line-clamp-1 group-hover:text-ocean-text/80 transition-colors">
                                      {language === 'tr' ? item.descTr : item.descEn}
                                    </p>
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bottom Footer Action Bar */}
                  <div className="px-5 py-2.5 border-t border-ocean-border/60 bg-ocean-deep/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-mono text-ocean-muted">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5">
                        <kbd className="px-1.5 py-0.5 rounded bg-ocean-surface border border-ocean-border text-[10px] text-ocean-text">⌘K</kbd>
                        <span>{language === 'tr' ? 'Hızlı komut & varlık arama' : 'Quick command & asset search'}</span>
                      </span>
                      <span className="text-ocean-border">•</span>
                      <button
                        onClick={() => {
                          setIsMegaMenuOpen(false);
                          setIsWatchlistOpen(true);
                        }}
                        className="hover:text-ocean-cyan flex items-center gap-1 transition-colors"
                      >
                        <Star className="w-3 h-3 text-amber-400" />
                        <span>{language === 'tr' ? 'İzleme Listesi' : 'Watchlist'}</span>
                        {watchlist.length > 0 && (
                          <span className="text-[10px] font-bold text-ocean-cyan">({watchlist.length})</span>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="w-2 h-2 rounded-full bg-ocean-green" />
                      <span>{language === 'tr' ? 'Doğrulanmış Hyperliquid APIv2' : 'Verified Hyperliquid APIv2'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side Tools: Search, Watchlist, Tour, Lang, Methodology, Connection, Mobile Toggle */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Global Search Button (Ctrl+K) */}
            <button
              onClick={() => setIsCommandOpen(true)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-ocean-border bg-ocean-surface/60 hover:bg-ocean-surface text-xs font-mono text-ocean-muted hover:text-ocean-cyan transition-colors"
              title={t.search.openCommand}
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{t.search.openCommand}</span>
              <kbd className="hidden md:inline-block text-[10px] px-1 py-0.2 rounded bg-ocean-deep border border-ocean-border text-ocean-muted">
                ⌘K
              </kbd>
            </button>

            {/* Watchlist Button */}
            <button
              onClick={() => setIsWatchlistOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-ocean-border bg-ocean-surface/60 hover:bg-ocean-surface text-xs font-mono text-ocean-muted hover:text-ocean-cyan transition-colors relative"
              title={t.watchlist.title}
            >
              <Star className="w-3.5 h-3.5 fill-ocean-cyan/20 text-ocean-cyan" />
              <span className="hidden sm:inline">{t.watchlist.title}</span>
              {watchlist.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-ocean-cyan animate-pulse" />
              )}
            </button>

            {/* Quick Tour Button */}
            <button
              onClick={() => setIsTourOpen(true)}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-ocean-border bg-ocean-surface/60 hover:bg-ocean-surface text-xs font-mono text-ocean-muted hover:text-ocean-text transition-colors"
              title={t.onboarding.openTour}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xl:inline">{t.onboarding.openTour}</span>
            </button>

            {/* Language Switcher */}
            <div className="hidden sm:flex items-center rounded-lg border border-ocean-border bg-ocean-surface/60 p-0.5 text-xs font-mono">
              <button
                type="button"
                onClick={() => setLanguage('tr')}
                className={`px-2 py-1 rounded transition-colors ${
                  language === 'tr'
                    ? 'bg-ocean-cyan/20 text-ocean-cyan font-bold shadow-xs'
                    : 'text-ocean-muted hover:text-ocean-text'
                }`}
                title="Türkçe"
              >
                TR
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 rounded transition-colors ${
                  language === 'en'
                    ? 'bg-ocean-cyan/20 text-ocean-cyan font-bold shadow-xs'
                    : 'text-ocean-muted hover:text-ocean-text'
                }`}
                title="English"
              >
                EN
              </button>
            </div>

            {/* Methodology Modal Trigger */}
            <button
              onClick={() => setIsMethodologyOpen(true)}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-ocean-border bg-ocean-surface/50 hover:bg-ocean-surface text-xs text-ocean-muted hover:text-ocean-cyan transition-colors font-mono"
              title="View data sources, formulas and verification methodology"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{t.nav.methodology}</span>
            </button>

            {/* Connection Badge */}
            <ConnectionBadge health={health} />

            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="xl:hidden p-2 rounded-lg border border-ocean-border bg-ocean-surface/80 text-ocean-muted hover:text-ocean-text transition-colors ml-1"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Global Modals */}
      <MethodologyModal
        isOpen={isMethodologyOpen}
        onClose={() => setIsMethodologyOpen(false)}
      />

      <CommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
      />

      <WatchlistModal
        isOpen={isWatchlistOpen}
        onClose={() => setIsWatchlistOpen(false)}
      />

      <OnboardingTour
        forceOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
      />

      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onOpenMethodology={() => setIsMethodologyOpen(true)}
        onOpenWatchlist={() => setIsWatchlistOpen(true)}
        onOpenTour={() => setIsTourOpen(true)}
        items={NAV_ITEMS}
      />
    </>
  );
}
