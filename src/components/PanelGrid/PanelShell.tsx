// electron-app/renderer/components/PanelGrid/PanelShell.tsx
/**
 * PanelShell — wraps every panel with a standard header bar:
 *   [drag handle] [title] [symbol badge] [close] [detach]
 *
 * The header bar is the draggable handle for react-grid-layout.
 */

import React from "react";
import { X, ExternalLink } from "lucide-react";
import { PanelId } from "../../services/commandParser";
import { ChartPanel }     from "../panels/ChartPanel/ChartPanel";
import { WatchlistPanel } from "../panels/WatchlistPanel/WatchlistPanel";
import { OrderBookPanel } from "../panels/OrderBookPanel/OrderBookPanel";
import { NewsPanel }      from "../panels/NewsPanel/NewsPanel";
import { PortfolioPanel } from "../panels/PortfolioPanel/PortfolioPanel";
import { AlertsPanel }    from "../panels/AlertsPanel/AlertsPanel";
import styles from "./PanelShell.module.css";

const PANEL_TITLES: Record<PanelId, string> = {
  chart:     "Chart",
  watchlist: "Watchlist",
  orderbook: "Order Book",
  news:      "News",
  portfolio: "Portfolio",
  alerts:    "Alerts",
  help:      "Help",
};

interface PanelShellProps {
  panelId:         PanelId;
  symbol:          string | null;
  onClose:         () => void;
  onSymbolChange:  (symbol: string) => void;
}

export const PanelShell: React.FC<PanelShellProps> = ({
  panelId, symbol, onClose, onSymbolChange,
}) => {
  return (
    <div className={styles.shell} data-panel-id={panelId}>
      {/* Header / drag handle */}
      <div className={`${styles.header} panel-drag-handle`}>
        <span className={styles.panelId}>{panelId.toUpperCase()}</span>
        <span className={styles.title}>{PANEL_TITLES[panelId]}</span>
        {symbol && (
          <span className={styles.symbolBadge}>{symbol}</span>
        )}
        <div className={styles.actions}>
          <button
            className={styles.actionBtn}
            onClick={onClose}
            title="Hide panel"
            aria-label="Close panel"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Panel body */}
      <div className={styles.body}>
        <PanelContent
          panelId={panelId}
          symbol={symbol}
          onSymbolChange={onSymbolChange}
        />
      </div>
    </div>
  );
};

const PanelContent: React.FC<{
  panelId:        PanelId;
  symbol:         string | null;
  onSymbolChange: (s: string) => void;
}> = ({ panelId, symbol, onSymbolChange }) => {
  switch (panelId) {
    case "chart":
      return <ChartPanel symbol={symbol ?? "BTCUSDT"} />;
    case "watchlist":
      return <WatchlistPanel onSymbolSelect={onSymbolChange} />;
    case "orderbook":
      return <OrderBookPanel symbol={symbol ?? "BTCUSDT"} />;
    case "news":
      return <NewsPanel symbol={symbol ?? "BTCUSDT"} />;
    case "portfolio":
      return <PortfolioPanel />;
    case "alerts":
      return <AlertsPanel />;
    default:
      return <div style={{ padding: 16, color: "#666" }}>Panel not implemented yet</div>;
  }
};
