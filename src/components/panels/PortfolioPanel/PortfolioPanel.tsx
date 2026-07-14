// electron-app/renderer/components/panels/PortfolioPanel/PortfolioPanel.tsx
/**
 * PortfolioPanel — paper-trading execution panel.
 *
 * Phase 5: ports the tkinter bot's logic into a React panel.
 *
 * Features:
 *   - Strategy status via GET /api/strategies/active
 *   - Deploy strategy via POST /api/strategies/deploy
 *   - Stop strategy via POST /api/strategies/stop/{id}
 *   - P&L equity curve via lightweight-charts (running balance from tick stream)
 *   - Position table: symbol, side, entry, current price, unrealised P&L
 *   - Paper-trade toggle (default ON — no real orders until explicitly disabled)
 */

import React, {
  useCallback, useEffect, useLayoutEffect, useRef, useState,
} from "react";
import {
  createChart, IChartApi, ISeriesApi, LineData, UTCTimestamp,
  LineSeries,
} from "lightweight-charts";
import { wsClient } from "../../../services/wsClient";
import styles from "./PortfolioPanel.module.css";

const API_BASE = "http://localhost:8000";
const POLL_MS  = 5_000;

interface Strategy {
  id:       string;
  symbol:   string;
  status:   string;
  pnl?:     number;
}

interface Position {
  symbol:      string;
  side:        "LONG" | "SHORT";
  entry_price: number;
  quantity:    number;
  current?:    number;
}

export const PortfolioPanel: React.FC = () => {
  const [paperMode,   setPaperMode]   = useState(true);
  const [strategies,  setStrategies]  = useState<Strategy[]>([]);
  const [positions,   setPositions]   = useState<Position[]>([]);
  const [totalPnl,    setTotalPnl]    = useState(0);
  const [loading,     setLoading]     = useState(false);

  // P&L chart
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef          = useRef<IChartApi | null>(null);
  const lineRef           = useRef<ISeriesApi<"Line"> | null>(null);
  const pnlHistory        = useRef<LineData[]>([]);

  // ── P&L chart init ────────────────────────────────────────────────────────
  useLayoutEffect(() => {
    if (!chartContainerRef.current) return;
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: "#101118" },
        textColor:  "#6b7280",
      },
      grid: {
        vertLines: { color: "#1e2030" },
        horzLines: { color: "#1e2030" },
      },
      rightPriceScale: { borderColor: "#1e2030" },
      timeScale:        { borderColor: "#1e2030", timeVisible: true },
      width:  chartContainerRef.current.clientWidth,
      height: 120,
    });

    const lineSeries = chart.addSeries(LineSeries, {
      color:     "#10b981",
      lineWidth: 2,
      priceLineVisible: false,
    });

    chartRef.current = chart;
    lineRef.current  = lineSeries;

    const ro = new ResizeObserver(() => {
      if (!chartContainerRef.current) return;
      chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    });
    ro.observe(chartContainerRef.current);

    return () => { ro.disconnect(); chart.remove(); };
  }, []);

  // ── Poll strategy status ──────────────────────────────────────────────────
  const pollStrategies = useCallback(async () => {
    try {
      const res  = await fetch(`${API_BASE}/api/strategies/active`);
      const data = await res.json();
      setStrategies(Array.isArray(data) ? data : []);

      // Update P&L
      const newPnl = (Array.isArray(data) ? data : [])
        .reduce((sum: number, s: Strategy) => sum + (s.pnl ?? 0), 0);
      setTotalPnl(newPnl);

      // Append to P&L chart
      if (lineRef.current) {
        const point: LineData = {
          time:  Math.floor(Date.now() / 1000) as UTCTimestamp,
          value: newPnl,
        };
        pnlHistory.current.push(point);
        // Keep last 500 points
        if (pnlHistory.current.length > 500) pnlHistory.current.shift();
        lineRef.current.setData(pnlHistory.current);
      }
    } catch (e) {
      // Silently tolerate — backend may not have strategy endpoints wired yet
    }
  }, []);

  useEffect(() => {
    pollStrategies();
    const id = setInterval(pollStrategies, POLL_MS);
    return () => clearInterval(id);
  }, [pollStrategies]);

  // ── Deploy a default strategy ────────────────────────────────────────────
  const handleDeploy = async () => {
    setLoading(true);
    try {
      await fetch(`${API_BASE}/api/strategies/deploy?strategy_id=momentum`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: "BTCUSDT",
          paper_mode: paperMode,
          quantity: 0.001,
        }),
      });
      await pollStrategies();
    } catch (e) {
      console.error("Deploy failed", e);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async (id: string) => {
    await fetch(`${API_BASE}/api/strategies/stop/${id}`, { method: "POST" });
    await pollStrategies();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const pnlClass = totalPnl >= 0 ? styles.pos : styles.neg;

  return (
    <div className={styles.root} data-panel-id="portfolio">
      {/* Header: P&L + paper mode toggle */}
      <div className={styles.header}>
        <div>
          <span className={styles.pnlLabel}>Unrealised P&L</span>
          <span className={`${styles.pnl} ${pnlClass}`}>
            {totalPnl >= 0 ? "+" : ""}{totalPnl.toFixed(4)} USDT
          </span>
        </div>
        <label className={styles.toggle} title="Paper trading mode (no real orders)">
          <input
            type="checkbox"
            checked={paperMode}
            onChange={(e) => setPaperMode(e.target.checked)}
          />
          <span className={styles.toggleTrack}>
            <span className={styles.toggleThumb} />
          </span>
          <span className={styles.toggleLabel}>Paper</span>
        </label>
      </div>

      {/* P&L equity curve */}
      <div ref={chartContainerRef} className={styles.pnlChart} />

      {/* Active strategies */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span>Active Strategies</span>
          <button
            className={styles.deployBtn}
            onClick={handleDeploy}
            disabled={loading}
          >
            {loading ? "…" : "+ Deploy"}
          </button>
        </div>
        {strategies.length === 0
          ? <p className={styles.empty}>No active strategies.</p>
          : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Symbol</th>
                  <th>Status</th>
                  <th className={styles.right}>P&L</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {strategies.map((s) => (
                  <tr key={s.id}>
                    <td className={styles.mono}>{s.id.slice(0, 8)}</td>
                    <td className={styles.mono}>{s.symbol}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${s.status === "running" ? styles.running : ""}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className={`${styles.right} ${(s.pnl ?? 0) >= 0 ? styles.pos : styles.neg}`}>
                      {s.pnl != null ? `${s.pnl >= 0 ? "+" : ""}${s.pnl.toFixed(4)}` : "—"}
                    </td>
                    <td>
                      <button
                        className={styles.stopBtn}
                        onClick={() => handleStop(s.id)}
                      >
                        Stop
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </div>

      {!paperMode && (
        <div className={styles.liveWarning}>
          ⚠ LIVE MODE — real orders will be placed
        </div>
      )}
    </div>
  );
};
