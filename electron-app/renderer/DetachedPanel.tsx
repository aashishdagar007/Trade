// electron-app/renderer/DetachedPanel.tsx
/**
 * DetachedPanel — standalone panel renderer for window.open() pop-outs.
 *
 * When the user clicks "Detach" on a panel, PanelGrid opens:
 *   window.open(`${origin}?panel=chart`, ...)
 *
 * This component reads the `?panel=` query param and renders only that
 * panel — no StatusBar, no CommandBar, no PanelGrid wrapper.
 *
 * The detached window still gets the same wsClient connection (separate
 * WebSocket instance — each window has its own JS context in Electron).
 *
 * Usage: called from main.tsx when window.location.search includes `panel=`.
 */

import React, { useState } from "react";
import { ChartPanel }     from "./components/panels/ChartPanel/ChartPanel";
import { WatchlistPanel } from "./components/panels/WatchlistPanel/WatchlistPanel";
import { OrderBookPanel } from "./components/panels/OrderBookPanel/OrderBookPanel";
import { NewsPanel }      from "./components/panels/NewsPanel/NewsPanel";
import { PortfolioPanel } from "./components/panels/PortfolioPanel/PortfolioPanel";
import { AlertsPanel }    from "./components/panels/AlertsPanel/AlertsPanel";
import styles from "./DetachedPanel.module.css";

type PanelParam =
  | "chart" | "watchlist" | "orderbook"
  | "news"  | "portfolio" | "alerts";

function getPanelParam(): PanelParam | null {
  const params = new URLSearchParams(window.location.search);
  const p      = params.get("panel") ?? "";
  const valid: PanelParam[] = [
    "chart", "watchlist", "orderbook", "news", "portfolio", "alerts",
  ];
  return valid.includes(p as PanelParam) ? (p as PanelParam) : null;
}

const PANEL_TITLES: Record<PanelParam, string> = {
  chart:     "Chart",
  watchlist: "Watchlist",
  orderbook: "Order Book",
  news:      "News & Sentiment",
  portfolio: "Portfolio",
  alerts:    "Alerts",
};

export function DetachedPanel() {
  const panelId = getPanelParam();
  const [symbol, setSymbol] = useState("BTCUSDT");

  if (!panelId) {
    return (
      <div className={styles.error}>
        <p>Invalid panel ID in URL query string.</p>
        <code>?panel=chart|watchlist|orderbook|news|portfolio|alerts</code>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      {/* Slim title bar */}
      <div className={styles.titleBar}>
        <span className={styles.panelLabel}>{panelId.toUpperCase()}</span>
        <span className={styles.panelTitle}>{PANEL_TITLES[panelId]}</span>
        {symbol && ["chart", "orderbook", "news"].includes(panelId) && (
          <span className={styles.symbolBadge}>{symbol}</span>
        )}
      </div>

      {/* Panel body — full remaining height */}
      <div className={styles.body}>
        {panelId === "chart"     && <ChartPanel symbol={symbol} />}
        {panelId === "watchlist" && (
          <WatchlistPanel onSymbolSelect={(s) => setSymbol(s)} />
        )}
        {panelId === "orderbook" && <OrderBookPanel symbol={symbol} />}
        {panelId === "news"      && <NewsPanel symbol={symbol} />}
        {panelId === "portfolio" && <PortfolioPanel />}
        {panelId === "alerts"    && <AlertsPanel />}
      </div>
    </div>
  );
}
