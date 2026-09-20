'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'whale_ocean_watchlist';

export interface WatchlistItem {
  address: string;
  whaleClass?: string;
  notes?: string;
  addedAt: number;
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setWatchlist(JSON.parse(stored));
      }
    } catch {
      // localStorage fallback
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const saveToStorage = useCallback((items: WatchlistItem[]) => {
    setWatchlist(items);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, []);

  const addWallet = useCallback((address: string, whaleClass?: string) => {
    const normalized = address.toLowerCase();
    setWatchlist((prev) => {
      if (prev.some((item) => item.address.toLowerCase() === normalized)) {
        return prev;
      }
      const updated = [
        ...prev,
        {
          address,
          whaleClass,
          addedAt: Date.now(),
        },
      ];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const removeWallet = useCallback((address: string) => {
    const normalized = address.toLowerCase();
    setWatchlist((prev) => {
      const updated = prev.filter((item) => item.address.toLowerCase() !== normalized);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const isTracked = useCallback(
    (address: string) => {
      const normalized = address.toLowerCase();
      return watchlist.some((item) => item.address.toLowerCase() === normalized);
    },
    [watchlist]
  );

  const clearAll = useCallback(() => {
    saveToStorage([]);
  }, [saveToStorage]);

  return {
    watchlist,
    isLoaded,
    addWallet,
    removeWallet,
    isTracked,
    clearAll,
  };
}
