// electron-app/renderer/components/panels/OrderBookPanel/OrderBookPanel.tsx
/**
 * OrderBookPanel — depth ladder for crypto symbols.
 *
 * Asset-class awareness (Phase 4 requirement):
 *   If the canonical tick has bid/ask == null (equities on free tier),
 *   the panel renders a graceful "Market depth unavailable" notice
 *   instead of crashing or showing an empty table.
 *
 * For crypto: subscribes to wsClient and reads bid/ask from the
 * canonical tick (populated from Binance depth stream by BinanceProvider).
 * The depth ladder is built from successive tick updates, not a separate
 * depth subscription.
 */

import React, { useEffect, useState } from "react";
import { wsClient, CanonicalTick } from "../../../services/wsClient";
import styles from "./OrderBookPanel.module.css";

interface OrderBookPanelProps {
  symbol: string;
}

interface Level { price: number; size: number; total: number; pct: number; }

export const OrderBookPanel: React.FC<OrderBookPanelProps> = ({ symbol }) => {
  const [tick,          setTick]          = useState<CanonicalTick | null>(null);
  const [isEquity,      setIsEquity]      = useState(false);

  useEffect(() => {
    const unsub = wsClient.subscribe(symbol, (t) => {
      setTick(t);
      setIsEquity(t.bid == null && t.asset_class === "equity");
    });
    return unsub;
  }, [symbol]);

  // ── Graceful degradation for equities ────────────────────────────────────
  if (isEquity) {
    return (
      <div className={styles.unavailable}>
        <span className={styles.unavailableIcon}>📊</span>
        <p className={styles.unavailableTitle}>Market Depth Unavailable</p>
        <p className={styles.unavailableMsg}>
          Level 2 order book data requires a paid data feed for equities.
          <br />
          Upgrade to Polygon.io or Alpaca for real-time depth.
        </p>
        {tick && (
          <p className={styles.fallback}>
            Last: <strong>{tick.price}</strong> · Δ{" "}
            {tick.change_pct != null ? `${tick.change_pct.toFixed(2)}%` : "—"}
          </p>
        )}
      </div>
    );
  }

  if (!tick || tick.bid == null || tick.ask == null) {
    return <div className={styles.loading}>Waiting for depth data…</div>;
  }

  if (!tick.bids || !tick.asks || tick.bids.length === 0 || tick.asks.length === 0) {
    return <div className={styles.loading}>Waiting for depth data…</div>;
  }

  const mid    = (tick.bid + tick.ask) / 2;
  const spread = tick.ask - tick.bid;

  // Real depth levels straight from Binance's depth stream (see
  // BinanceProvider._build_tick on the backend) -- best price first in
  // both arrays, as sent by the exchange.
  const bids: Level[] = levelsFromDepth(tick.bids);
  const asks: Level[] = levelsFromDepth(tick.asks);

  return (
    <div className={styles.root} data-panel-id="orderbook">
      {/* Asks (top, red) */}
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Price</th>
            <th className={styles.right}>Size</th>
            <th className={styles.right}>Total</th>
          </tr>
        </thead>
        <tbody>
          {[...asks].reverse().map((l, i) => (
            <LevelRow key={i} level={l} side="ask" />
          ))}
        </tbody>
      </table>

      {/* Mid / spread */}
      <div className={styles.midRow}>
        <span className={styles.mid}>{mid.toFixed(4)}</span>
        <span className={styles.spread}>spread {spread.toFixed(4)}</span>
      </div>

      {/* Bids (bottom, green) */}
      <table className={styles.table}>
        <tbody>
          {bids.map((l, i) => (
            <LevelRow key={i} level={l} side="bid" />
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function levelsFromDepth(depth: [number, number][]): Level[] {
  // depth is [[price, size], ...], best price first, straight from Binance.
  let total = 0;
  const levels: Level[] = depth.map(([price, size]) => {
    total += size;
    return { price, size, total, pct: 0 };
  });
  const maxTotal = levels[levels.length - 1]?.total || 1;
  return levels.map((l) => ({ ...l, pct: (l.total / maxTotal) * 100 }));
}

const LevelRow: React.FC<{ level: Level; side: "bid" | "ask" }> = ({ level, side }) => (
  <tr className={styles.levelRow} style={{ position: "relative" }}>
    {/* Depth visualisation bar */}
    <td className={styles.barCell}>
      <div
        className={`${styles.bar} ${side === "bid" ? styles.bidBar : styles.askBar}`}
        style={{ width: `${level.pct}%` }}
      />
      <span className={`${styles.levelPrice} ${side === "bid" ? styles.bidPrice : styles.askPrice}`}>
        {level.price.toFixed(4)}
      </span>
    </td>
    <td className={styles.right}>{level.size.toFixed(4)}</td>
    <td className={styles.right}>{level.total.toFixed(4)}</td>
  </tr>
);
