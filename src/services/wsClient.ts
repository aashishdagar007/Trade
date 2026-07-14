// electron-app/renderer/services/wsClient.ts
/**
 * wsClient — single persistent WebSocket connection to /ws/feed.
 *
 * API
 * ---
 * wsClient.subscribe(symbol, handler)   → unsubscribe()
 * wsClient.unsubscribeAll()
 *
 * The client:
 *   1. Opens one WS connection to the backend.
 *   2. Sends { action: "subscribe", symbol } for each active subscription.
 *   3. Distributes incoming ticks to all handlers registered for that symbol.
 *   4. Reconnects automatically with exponential backoff on disconnect.
 *   5. Re-subscribes all active symbols after reconnect (no handler re-registration needed).
 */

export interface CanonicalTick {
  symbol:      string;
  asset_class: "crypto" | "equity";
  price:       number;
  ts:          number;
  volume:      number | null;
  bid:         number | null;
  ask:         number | null;
  open:        number | null;
  high:        number | null;
  low:         number | null;
  change_pct:  number | null;
  spread:      number | null;
  spread_bps:  number | null;
  seq:         number;
  // Top-of-book depth ladder, best price first. null for equities (no L2 source).
  bids:        [number, number][] | null;
  asks:        [number, number][] | null;
}

export type TickHandler = (tick: CanonicalTick) => void;

interface WsMessage {
  type:    string;
  data?:   CanonicalTick;
  symbol?: string;
  message?: string;
}

const WS_URL         = "ws://localhost:8000/ws/feed";
const BACKOFF_BASE   = 500;    // ms
const BACKOFF_MAX    = 30_000; // ms

class WsClient {
  private socket:       WebSocket | null    = null;
  private handlers:     Map<string, Set<TickHandler>> = new Map();
  private retryCount    = 0;
  private retryTimer:   ReturnType<typeof setTimeout> | null = null;
  private intentionallyClosed = false;

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Subscribe to live ticks for *symbol*.
   * Returns an unsubscribe function — call it when the component unmounts.
   */
  subscribe(symbol: string, handler: TickHandler): () => void {
    const sym = symbol.toUpperCase();
    if (!this.handlers.has(sym)) {
      this.handlers.set(sym, new Set());
    }
    this.handlers.get(sym)!.add(handler);

    // Ensure connection is open and server knows we want this symbol
    this._ensureConnected();
    this._sendSubscribe(sym);

    return () => this._removeHandler(sym, handler);
  }

  /** Tear down all subscriptions and close the connection. */
  unsubscribeAll(): void {
    this.intentionallyClosed = true;
    this.handlers.clear();
    this.socket?.close();
    if (this.retryTimer) clearTimeout(this.retryTimer);
  }

  // ─── Connection management ─────────────────────────────────────────────────

  private _ensureConnected(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) return;
    if (this.socket && this.socket.readyState === WebSocket.CONNECTING) return;
    this._connect();
  }

  private _connect(): void {
    this.intentionallyClosed = false;
    const ws = new WebSocket(WS_URL);
    this.socket = ws;

    ws.onopen = () => {
      console.log("[wsClient] connected");
      this.retryCount = 0;
      // Re-subscribe all active symbols after reconnect
      for (const sym of this.handlers.keys()) {
        this._sendSubscribe(sym);
      }
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg: WsMessage = JSON.parse(event.data as string);
        if (msg.type === "tick" && msg.data) {
          this._dispatch(msg.data);
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onerror = (err) => {
      console.warn("[wsClient] error:", err);
    };

    ws.onclose = () => {
      if (this.intentionallyClosed) return;
      this._scheduleReconnect();
    };
  }

  private _scheduleReconnect(): void {
    const delay = Math.min(
      BACKOFF_BASE * Math.pow(2, this.retryCount),
      BACKOFF_MAX,
    );
    this.retryCount++;
    console.log(`[wsClient] reconnecting in ${delay}ms (attempt ${this.retryCount})`);
    this.retryTimer = setTimeout(() => this._connect(), delay);
  }

  // ─── Subscription helpers ──────────────────────────────────────────────────

  private _sendSubscribe(symbol: string): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ action: "subscribe", symbol }));
    }
  }

  private _sendUnsubscribe(symbol: string): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ action: "unsubscribe", symbol }));
    }
  }

  private _removeHandler(symbol: string, handler: TickHandler): void {
    const set = this.handlers.get(symbol);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) {
      this.handlers.delete(symbol);
      this._sendUnsubscribe(symbol);
    }
  }

  // ─── Dispatch ──────────────────────────────────────────────────────────────

  private _dispatch(tick: CanonicalTick): void {
    const set = this.handlers.get(tick.symbol);
    if (!set) return;
    for (const handler of set) {
      try { handler(tick); } catch { /* ignore */ }
    }
  }
}

// Module-level singleton — import this everywhere in the renderer
export const wsClient = new WsClient();
