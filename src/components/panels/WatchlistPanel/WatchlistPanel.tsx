// electron-app/renderer/components/panels/WatchlistPanel/WatchlistPanel.tsx
/**
 * WatchlistPanel — mixed crypto + equity watchlist.
 *
 * Each row receives live ticks from wsClient.
 * Clicking a row fires onSymbolSelect so PanelGrid can route to ChartPanel.
 * Colour-coded Δ% with micro-animation on tick update.
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { wsClient, CanonicalTick } from "../../../services/wsClient";
import styles from "./WatchlistPanel.module.css";

// Default watchlist — mix of crypto and equity
const DEFAULT_SYMBOLS = [
  "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT",
  "AAPL", "MSFT", "TSLA", "NVDA", "AMZN",
];

interface RowData {
  symbol:     string;
  asset_class: "crypto" | "equity" | null;
  price:      number | null;
  change_pct: number | null;
  volume:     number | null;
  flashing:   boolean;
}

interface WatchlistPanelProps {
  onSymbolSelect: (symbol: string) => void;
}

export const WatchlistPanel: React.FC<WatchlistPanelProps> = ({ onSymbolSelect }) => {
  const [rows, setRows] = useState<RowData[]>(
    DEFAULT_SYMBOLS.map((s) => ({
      symbol: s, asset_class: null,
      price: null, change_pct: null, volume: null, flashing: false,
    }))
  );
  const flashTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Subscribe to all symbols
  useEffect(() => {
    const unsubs = DEFAULT_SYMBOLS.map((symbol) =>
      wsClient.subscribe(symbol, (tick: CanonicalTick) => {
        setRows((prev) =>
          prev.map((row) => {
            if (row.symbol !== tick.symbol) return row;
            return {
              ...row,
              asset_class: tick.asset_class,
              price:       tick.price,
              change_pct:  tick.change_pct,
              volume:      tick.volume,
              flashing:    true,
            };
          })
        );
        // Clear flash after 400ms
        const prev = flashTimers.current.get(symbol);
        if (prev) clearTimeout(prev);
        flashTimers.current.set(symbol, setTimeout(() => {
          setRows((r) => r.map((row) =>
            row.symbol === symbol ? { ...row, flashing: false } : row
          ));
        }, 400));
      })
    );
    return () => unsubs.forEach((u) => u());
  }, []);

  const fmtPrice = (p: number | null, sym: string) => {
    if (p == null) return "—";
    const isCrypto = sym.endsWith("USDT");
    return p.toLocaleString(undefined, {
      maximumFractionDigits: isCrypto ? 4 : 2,
      minimumFractionDigits: 2,
    });
  };

  const fmtPct = (p: number | null) => {
    if (p == null) return "—";
    return `${p >= 0 ? "+" : ""}${p.toFixed(2)}%`;
  };

  const fmtVol = (v: number | null) => {
    if (v == null) return "—";
    if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
    return v.toFixed(0);
  };

  return (
    <div className={styles.root} data-panel-id="watchlist">
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Symbol</th>
            <th className={styles.right}>Price</th>
            <th className={styles.right}>Chg %</th>
            <th className={styles.right}>Volume</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const pos = row.change_pct != null && row.change_pct >= 0;
            const neg = row.change_pct != null && row.change_pct < 0;
            return (
              <tr
                key={row.symbol}
                className={`${styles.row} ${row.flashing ? styles.flash : ""}`}
                onClick={() => onSymbolSelect(row.symbol)}
                tabIndex={0}
                data-focusable="true"
                onKeyDown={(e) => e.key === "Enter" && onSymbolSelect(row.symbol)}
                aria-label={`${row.symbol} ${row.price ?? "loading"}`}
              >
                <td>
                  <span className={styles.sym}>{row.symbol}</span>
                  {row.asset_class && (
                    <span className={`${styles.badge} ${row.asset_class === "crypto" ? styles.crypto : styles.equity}`}>
                      {row.asset_class === "crypto" ? "C" : "E"}
                    </span>
                  )}
                </td>
                <td className={styles.right}>
                  <span className={styles.price}>{fmtPrice(row.price, row.symbol)}</span>
                </td>
                <td className={styles.right}>
                  <span className={`${styles.pct} ${pos ? styles.pos : neg ? styles.neg : ""}`}>
                    {fmtPct(row.change_pct)}
                  </span>
                </td>
                <td className={`${styles.right} ${styles.vol}`}>{fmtVol(row.volume)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
