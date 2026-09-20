'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from './Navbar';
import { ConnectionHealth } from '@/types/contracts';
import { useTranslation } from '@/i18n';

export function Shell({ children }: { children: React.ReactNode }) {
  const [health, setHealth] = useState<ConnectionHealth>({
    status: 'CONNECTING',
    lastMessageTimestamp: null,
    latencyMs: null,
    reconnectAttempts: 0,
  });

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectSSE = () => {
      eventSource = new EventSource('/api/stream');

      eventSource.addEventListener('health', (e) => {
        try {
          const parsed = JSON.parse(e.data);
          setHealth(parsed);
        } catch {}
      });

      eventSource.onerror = () => {
        setHealth((prev) => ({
          ...prev,
          status: 'STALE',
        }));
        eventSource?.close();
        reconnectTimeout = setTimeout(connectSSE, 3000);
      };
    };

    connectSSE();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      eventSource?.close();
    };
  }, []);

  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-ocean-abyss text-ocean-text flex flex-col font-sans ocean-gradient">
      <Navbar health={health} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
      <footer className="border-t border-ocean-border py-4 text-center text-xs text-ocean-muted font-mono">
        WHALE OCEAN &bull; Hyperliquid {t.nav.ocean} &bull; {t.methodology.zeroFakeTitle} &bull; {t.common.disclaimer}
      </footer>
    </div>
  );
}
