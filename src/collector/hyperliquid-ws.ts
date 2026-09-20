import { ConnectionStatus, ConnectionHealth } from '../types/contracts';

const HYPERLIQUID_WS_URL = 'wss://api.hyperliquid.xyz/ws';
const PING_INTERVAL_MS = 30_000;
const STALE_THRESHOLD_MS = 10_000;

export type WsMessageHandler = (channel: string, data: any) => void;
export type HealthChangeHandler = (health: ConnectionHealth) => void;

// Use standard global WebSocket (supported natively in Node 22+ & Browsers)
const WSClass = globalThis.WebSocket;

export class HyperliquidWsClient {
  private wsUrl: string;
  private ws: any | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private staleCheckTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private isExplicitlyClosed = false;
  private lastPingTimestamp: number | null = null;

  private health: ConnectionHealth = {
    status: 'CONNECTING',
    lastMessageTimestamp: null,
    latencyMs: null,
    reconnectAttempts: 0,
  };

  private messageHandlers: Set<WsMessageHandler> = new Set();
  private healthHandlers: Set<HealthChangeHandler> = new Set();

  constructor(wsUrl = HYPERLIQUID_WS_URL) {
    this.wsUrl = wsUrl;
  }

  onMessage(handler: WsMessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onHealthChange(handler: HealthChangeHandler): () => void {
    this.healthHandlers.add(handler);
    handler(this.getHealth());
    return () => this.healthHandlers.delete(handler);
  }

  getHealth(): ConnectionHealth {
    return { ...this.health };
  }

  private updateHealth(updates: Partial<ConnectionHealth>): void {
    this.health = { ...this.health, ...updates };
    for (const handler of this.healthHandlers) {
      handler(this.getHealth());
    }
  }

  connect(): void {
    this.isExplicitlyClosed = false;
    this.updateHealth({ status: 'CONNECTING' });

    try {
      this.ws = new WSClass(this.wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.updateHealth({
          status: 'LIVE',
          reconnectAttempts: 0,
          lastMessageTimestamp: Date.now(),
        });

        this.startPing();
        this.startStaleDetection();
        this.subscribeDefault();
      };

      this.ws.onmessage = (event: MessageEvent) => {
        const now = Date.now();
        this.updateHealth({
          status: 'LIVE',
          lastMessageTimestamp: now,
        });

        try {
          const raw = typeof event.data === 'string' ? event.data : event.data.toString();
          const message = JSON.parse(raw);

          // Handle pong response for truthful round-trip latency measurement
          if (message.channel === 'pong' && this.lastPingTimestamp) {
            const rtt = Math.max(1, now - this.lastPingTimestamp);
            this.updateHealth({ latencyMs: rtt });
            this.lastPingTimestamp = null;
            return;
          }

          if (message.channel && message.data) {
            for (const handler of this.messageHandlers) {
              handler(message.channel, message.data);
            }
          }
        } catch {
          // Ignore unparseable raw frame
        }
      };

      this.ws.onerror = () => {
        this.updateHealth({ status: 'STALE' });
      };

      this.ws.onclose = () => {
        this.stopTimers();
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        } else {
          this.updateHealth({ status: 'DATA_UNAVAILABLE' });
        }
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private subscribeDefault(): void {
    if (!this.ws || this.ws.readyState !== 1) return; // 1 = OPEN

    // Subscribe to allMids for market-wide price discovery
    this.send({
      method: 'subscribe',
      subscription: { type: 'allMids' },
    });

    // Subscribe to active trades on top volume markets to discover live trader wallets
    const highVolumeCoins = ['BTC', 'ETH', 'SOL', 'HYPE', 'DOGE', 'SUI', 'AVAX', 'LINK'];
    for (const coin of highVolumeCoins) {
      this.send({
        method: 'subscribe',
        subscription: { type: 'trades', coin },
      });
    }
  }

  public subscribeTrades(coin: string): void {
    this.send({
      method: 'subscribe',
      subscription: { type: 'trades', coin },
    });
  }

  private send(payload: unknown): void {
    if (this.ws && this.ws.readyState === 1) { // 1 = OPEN
      this.ws.send(JSON.stringify(payload));
    }
  }

  private startPing(): void {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === 1) {
        this.lastPingTimestamp = Date.now();
        this.send({ method: 'ping' });
      }
    }, PING_INTERVAL_MS);
  }

  private startStaleDetection(): void {
    if (this.staleCheckTimer) clearInterval(this.staleCheckTimer);
    this.staleCheckTimer = setInterval(() => {
      if (this.health.lastMessageTimestamp) {
        const elapsed = Date.now() - this.health.lastMessageTimestamp;
        if (elapsed > STALE_THRESHOLD_MS && this.health.status === 'LIVE') {
          this.updateHealth({ status: 'STALE' });
        }
      }
    }, 2_000);
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30_000);
    this.updateHealth({
      status: this.reconnectAttempts > 3 ? 'DATA_UNAVAILABLE' : 'STALE',
      reconnectAttempts: this.reconnectAttempts,
    });

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private stopTimers(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.staleCheckTimer) {
      clearInterval(this.staleCheckTimer);
      this.staleCheckTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  disconnect(): void {
    this.isExplicitlyClosed = true;
    this.stopTimers();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.updateHealth({ status: 'DATA_UNAVAILABLE' });
  }
}
