/**
 * Single WebSocket connection to the backend, shared by every panel.
 * Panels call subscribe(symbol, callback) and get ticks pushed to them;
 * the client handles the fact that multiple panels might watch the same symbol.
 */

const WS_URL = 'ws://localhost:8000/ws';

class MarketDataClient {
  constructor() {
    this.socket = null;
    this.listeners = new Map(); // symbol -> Set of callbacks
    this._connect();
  }

  _connect() {
    this.socket = new WebSocket(WS_URL);

    this.socket.onmessage = (event) => {
      const tick = JSON.parse(event.data);
      const callbacks = this.listeners.get(tick.symbol);
      if (callbacks) {
        callbacks.forEach((cb) => cb(tick));
      }
    };

    this.socket.onclose = () => {
      // reconnect after a short delay; re-subscribe to everything we had
      setTimeout(() => {
        const symbols = [...this.listeners.keys()];
        this._connect();
        this.socket.addEventListener('open', () => {
          symbols.forEach((s) => this._send('subscribe', s));
        }, { once: true });
      }, 1500);
    };
  }

  _send(action, symbol) {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ action, symbol }));
    } else {
      this.socket.addEventListener('open', () => {
        this.socket.send(JSON.stringify({ action, symbol }));
      }, { once: true });
    }
  }

  subscribe(symbol, callback) {
    const upperSymbol = symbol.toUpperCase();
    if (!this.listeners.has(upperSymbol)) {
      this.listeners.set(upperSymbol, new Set());
      this._send('subscribe', upperSymbol);
    }
    this.listeners.get(upperSymbol).add(callback);

    // return an unsubscribe function
    return () => {
      const callbacks = this.listeners.get(upperSymbol);
      if (!callbacks) return;
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(upperSymbol);
        this._send('unsubscribe', upperSymbol);
      }
    };
  }
}

// One shared instance across the whole renderer.
export const marketDataClient = new MarketDataClient();
