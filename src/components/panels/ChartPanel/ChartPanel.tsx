// electron-app/renderer/components/panels/ChartPanel/ChartPanel.tsx
/**
 * ChartPanel — lightweight-charts candlestick + volume chart.
 *
 * Wiring:
 *   1. Fetches historical bars from GET /api/history/{symbol}?interval=&limit=
 *   2. Subscribes to wsClient for live tick updates
 *   3. Updates the last candle in real time (no gap between history and live)
 *
 * Asset-class awareness:
 *   - Crypto (bid/ask not null): shows spread in the header
 *   - Equities (bid/ask null): spread row is hidden
 */

import React, {
  useEffect, useLayoutEffect, useRef, useState, useCallback,
} from "react";
import {
  createChart, IChartApi, ISeriesApi,
  CandlestickData, UTCTimestamp,
  CandlestickSeries, HistogramSeries,
} from "lightweight-charts";
import { wsClient, CanonicalTick } from "../../../services/wsClient";
import styles from "./ChartPanel.module.css";

const API_BASE = "http://localhost:8000";

type Interval = "1m" | "5m" | "15m" | "1h" | "1d";

interface Bar {
  ts: number; open: number; high: number; low: number; close: number; volume: number;
}

// Seconds per bar for each interval -- used to figure out which bar a raw
// tick timestamp belongs to.
const INTERVAL_SECONDS: Record<Interval, number> = {
  "1m": 60, "5m": 300, "15m": 900, "1h": 3600, "1d": 86400,
};

function bucketStart(tsMs: number, interval: Interval): number {
  const secs   = Math.floor(tsMs / 1000);
  const bucket = INTERVAL_SECONDS[interval];
  return secs - (secs % bucket);
}

// The bar currently being built from live ticks. Built from tick.price only
// -- never from tick.open/high/low, which are the exchange's 24-HOUR
// rolling stats (see providers/base.py's Tick docstring), not this bar's
// stats. Using those directly was the original bug: every live update
// painted a candle spanning the full 24h range at the tick's raw timestamp
// instead of extending the current interval's bar.
interface LiveBar {
  time: number; open: number; high: number; low: number; close: number; volume: number;
}

interface ChartPanelProps {
  symbol: string;
}

export const ChartPanel: React.FC<ChartPanelProps> = ({ symbol }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);
  const candleRef    = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef    = useRef<ISeriesApi<"Histogram"> | null>(null);

  const [interval,   setInterval]   = useState<Interval>("1h");
  const [lastTick,   setLastTick]   = useState<CanonicalTick | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  // The bar currently being built from live ticks -- seeded from the last
  // historical bar on load, replaced wholesale whenever symbol/interval
  // changes (see fetchHistory below).
  const currentBarRef = useRef<LiveBar | null>(null);

  // ── Chart init ────────────────────────────────────────────────────────────
  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "#0d0e14" },
        textColor:  "#6b7280",
      },
      grid: {
        vertLines: { color: "#1e2030" },
        horzLines: { color: "#1e2030" },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: "#1e2030" },
      timeScale: { borderColor: "#1e2030", timeVisible: true },
      width:  containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor:          "#10b981",
      downColor:        "#ef4444",
      borderUpColor:    "#10b981",
      borderDownColor:  "#ef4444",
      wickUpColor:      "#10b981",
      wickDownColor:    "#ef4444",
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color:        "#1e2030",
      priceFormat:  { type: "volume" },
      priceScaleId: "volume",
    });
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    chartRef.current  = chart;
    candleRef.current = candleSeries;
    volumeRef.current = volumeSeries;

    // Resize observer
    const ro = new ResizeObserver(() => {
      if (!containerRef.current) return;
      chart.applyOptions({
        width:  containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current  = null;
      candleRef.current = null;
      volumeRef.current = null;
    };
  }, []);

  // ── History fetch ────────────────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    if (!candleRef.current || !volumeRef.current) return;
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`${API_BASE}/api/history/${symbol}?interval=${interval}&limit=500`);
      const bars: Bar[] = await res.json();

      const candles: CandlestickData[] = bars.map((b) => ({
        time:  (b.ts / 1000) as UTCTimestamp,
        open:  b.open, high: b.high, low: b.low, close: b.close,
      }));
      const volumes = bars.map((b) => ({
        time:  (b.ts / 1000) as UTCTimestamp,
        value: b.volume,
        color: b.close >= b.open ? "#10b98133" : "#ef444433",
      }));

      candleRef.current.setData(candles);
      volumeRef.current.setData(volumes);
      chartRef.current?.timeScale().fitContent();

      // Seed the live bar from the last historical bar so the first live
      // tick continues it rather than starting a fresh empty bar. Only
      // seed if that bar's bucket is still the *current* bucket -- if
      // history's last bar is from a bucket that's already closed, start
      // fresh instead of resurrecting a stale one.
      const lastBar = bars[bars.length - 1];
      if (lastBar) {
        const nowBucket  = bucketStart(Date.now(), interval);
        const lastBucket = bucketStart(lastBar.ts, interval);
        currentBarRef.current = lastBucket === nowBucket
          ? { time: lastBucket, open: lastBar.open, high: lastBar.high, low: lastBar.low, close: lastBar.close, volume: lastBar.volume }
          : null; // next live tick will start a brand new bar for the current bucket
      } else {
        currentBarRef.current = null;
      }
    } catch (e: unknown) {
      setError("Failed to load history");
    } finally {
      setLoading(false);
    }
  }, [symbol, interval]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // ── Live tick subscription ────────────────────────────────────────────────
  useEffect(() => {
    const unsub = wsClient.subscribe(symbol, (tick) => {
      setLastTick(tick);
      if (!candleRef.current || !volumeRef.current) return;

      const bucket  = bucketStart(tick.ts, interval);
      const current = currentBarRef.current;

      let bar: LiveBar;
      if (!current || bucket > current.time) {
        // New bar: either the first live tick ever, or the interval
        // boundary has passed. Open at this tick's price -- there's no
        // better anchor available client-side without waiting for the
        // next history refetch.
        bar = { time: bucket, open: tick.price, high: tick.price, low: tick.price, close: tick.price, volume: tick.volume ?? 0 };
      } else if (bucket === current.time) {
        // Same bar as before: extend high/low, move close, accumulate volume.
        bar = {
          time:  current.time,
          open:  current.open,
          high:  Math.max(current.high, tick.price),
          low:   Math.min(current.low, tick.price),
          close: tick.price,
          volume: current.volume + (tick.volume ?? 0),
        };
      } else {
        // bucket < current.time -- an out-of-order/late tick for a bar
        // that's already closed. Don't rewrite history from a stray tick.
        return;
      }

      currentBarRef.current = bar;

      try {
        candleRef.current.update({
          time:  bar.time as UTCTimestamp,
          open:  bar.open, high: bar.high, low: bar.low, close: bar.close,
        });
        volumeRef.current.update({
          time:  bar.time as UTCTimestamp,
          value: bar.volume,
          color: bar.close >= bar.open ? "#10b98133" : "#ef444433",
        });
      } catch { /* lightweight-charts rejected it -- ignore and wait for the next tick */ }
    });
    return unsub;
  }, [symbol, interval]);

  // ── Render ────────────────────────────────────────────────────────────────
  const changePct   = lastTick?.change_pct;
  const changeClass = changePct == null ? "" : changePct >= 0 ? styles.pos : styles.neg;

  return (
    <div className={styles.root} data-panel-id="chart">
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <span className={styles.symbolLabel}>{symbol}</span>
        {lastTick && (
          <>
            <span className={styles.price}>
              {lastTick.price.toLocaleString(undefined, { maximumFractionDigits: 8 })}
            </span>
            <span className={`${styles.change} ${changeClass}`}>
              {changePct != null ? `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%` : ""}
            </span>
            {lastTick.bid != null && lastTick.ask != null && (
              <span className={styles.spread}>
                Spread: {lastTick.spread_bps?.toFixed(1)} bps
              </span>
            )}
          </>
        )}

        {/* Interval selector */}
        <div className={styles.intervals}>
          {(["1m", "5m", "15m", "1h", "1d"] as Interval[]).map((iv) => (
            <button
              key={iv}
              className={`${styles.ivBtn} ${interval === iv ? styles.ivActive : ""}`}
              onClick={() => setInterval(iv)}
            >
              {iv}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className={styles.chartWrap} ref={containerRef}>
        {loading && <div className={styles.overlay}>Loading…</div>}
        {error   && <div className={styles.overlayErr}>{error}</div>}
      </div>
    </div>
  );
};
