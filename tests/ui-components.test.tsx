import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ConnectionBadge } from '../src/components/layout/ConnectionBadge';
import { ConnectionHealth } from '../src/types/contracts';

describe('UI Components & Truthful Status Indicators', () => {
  it('should render LIVE state when connection is healthy in Turkish default', () => {
    const health: ConnectionHealth = {
      status: 'LIVE',
      lastMessageTimestamp: Date.now() - 500,
      latencyMs: 35,
      reconnectAttempts: 0,
    };

    const html = renderToStaticMarkup(<ConnectionBadge health={health} />);
    expect(html).toContain('CANLI');
    expect(html).toContain('35ms');
    expect(html).toContain('Verified real-time connection');
  });

  it('should render STALE state with warning title when last update is delayed in Turkish default', () => {
    const health: ConnectionHealth = {
      status: 'STALE',
      lastMessageTimestamp: Date.now() - 15000,
      latencyMs: 120,
      reconnectAttempts: 1,
    };

    const html = renderToStaticMarkup(<ConnectionBadge health={health} />);
    expect(html).toContain('BAYAT VERİ');
    expect(html).toContain('Data is stale');
  });

  it('should render DATA UNAVAILABLE when connection is broken in Turkish default', () => {
    const health: ConnectionHealth = {
      status: 'DATA_UNAVAILABLE',
      lastMessageTimestamp: null,
      latencyMs: null,
      reconnectAttempts: 5,
    };

    const html = renderToStaticMarkup(<ConnectionBadge health={health} />);
    expect(html).toContain('VERİ KULLANILAMIYOR');
    expect(html).toContain('Hyperliquid stream currently unavailable');
  });
});
