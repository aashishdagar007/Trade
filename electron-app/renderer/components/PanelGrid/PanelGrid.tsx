// electron-app/renderer/components/PanelGrid/PanelGrid.tsx
/**
 * PanelGrid — react-grid-layout based draggable/resizable panel dock.
 *
 * Features:
 *   - Drag & resize any panel within the grid
 *   - Layout persisted to localStorage (survives page refresh)
 *   - "Detach" button per panel opens it in a standalone window.open()
 *   - Panels can be shown/hidden individually
 *   - Responsive breakpoints: lg (≥1200px) → 12 cols, md (≥960px) → 10 cols
 *
 * Layout slots map to PanelId — each slot renders the correct panel component.
 */

import React, { useCallback, useEffect, useState } from "react";
import GridLayout, { Layout, Responsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import styles from "./PanelGrid.module.css";
import { PanelId } from "../../services/commandParser";
import { PanelShell } from "./PanelShell";

const ResponsiveGridLayout = WidthProvider(Responsive);

// ─── Default layout ───────────────────────────────────────────────────────────

const DEFAULT_LAYOUTS: Record<string, Layout[]> = {
  lg: [
    { i: "chart",     x: 0,  y: 0,  w: 7, h: 14, minW: 4, minH: 8  },
    { i: "watchlist", x: 7,  y: 0,  w: 3, h: 14, minW: 2, minH: 6  },
    { i: "alerts",    x: 10, y: 0,  w: 2, h: 14, minW: 2, minH: 6  },
    { i: "orderbook", x: 0,  y: 14, w: 3, h: 10, minW: 2, minH: 6  },
    { i: "news",      x: 3,  y: 14, w: 5, h: 10, minW: 2, minH: 6  },
    { i: "portfolio", x: 8,  y: 14, w: 4, h: 10, minW: 2, minH: 6  },
  ],
};

const STORAGE_KEY = "tradepro:panel-layouts";

function loadLayouts(): Record<string, Layout[]> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return DEFAULT_LAYOUTS;
}

function saveLayouts(layouts: Record<string, Layout[]>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
  } catch { /* ignore */ }
}

// ─── Panel visibility state ───────────────────────────────────────────────────

export interface PanelState {
  id:       PanelId;
  visible:  boolean;
  symbol:   string | null;
}

const INITIAL_PANELS: PanelState[] = [
  { id: "chart",     visible: true,  symbol: "BTCUSDT" },
  { id: "watchlist", visible: true,  symbol: null },
  { id: "alerts",    visible: true,  symbol: null },
  { id: "orderbook", visible: true,  symbol: "BTCUSDT" },
  { id: "news",      visible: true,  symbol: "BTCUSDT" },
  { id: "portfolio", visible: true,  symbol: null },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface PanelGridProps {
  /** Commanded by CommandBar — routes a symbol load to the right panel */
  activeCommand?: { panel: PanelId; symbol: string | null } | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const PanelGrid: React.FC<PanelGridProps> = ({ activeCommand }) => {
  const [layouts, setLayouts] = useState<Record<string, Layout[]>>(loadLayouts);
  const [panels,  setPanels]  = useState<PanelState[]>(INITIAL_PANELS);

  // React to commands from the CommandBar
  useEffect(() => {
    if (!activeCommand) return;
    setPanels((prev) =>
      prev.map((p) =>
        p.id === activeCommand.panel
          ? { ...p, visible: true, symbol: activeCommand.symbol ?? p.symbol }
          : p
      )
    );
  }, [activeCommand]);

  const onLayoutChange = useCallback(
    (_layout: Layout[], allLayouts: Record<string, Layout[]>) => {
      setLayouts(allLayouts);
      saveLayouts(allLayouts);
    },
    []
  );

  const handleSymbolChange = useCallback((panelId: PanelId, symbol: string) => {
    setPanels((prev) =>
      prev.map((p) => (p.id === panelId ? { ...p, symbol } : p))
    );
  }, []);

  const handleClose = useCallback((panelId: PanelId) => {
    setPanels((prev) =>
      prev.map((p) => (p.id === panelId ? { ...p, visible: false } : p))
    );
  }, []);

  const handleDetach = useCallback((panelId: PanelId) => {
    const url = `${window.location.origin}?panel=${panelId}`;
    window.open(url, `_blank`, "width=800,height=600,menubar=no,toolbar=no");
    window.electronAPI?.notifyPanelDetached(panelId);
  }, []);

  const visiblePanels = panels.filter((p) => p.visible);

  return (
    <div className={styles.grid}>
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 960, sm: 720 }}
        cols={{ lg: 12, md: 10, sm: 6 }}
        rowHeight={30}
        onLayoutChange={onLayoutChange}
        draggableHandle=".panel-drag-handle"
        margin={[4, 4]}
        containerPadding={[4, 4]}
      >
        {visiblePanels.map((panel) => (
          <div key={panel.id} className={styles.panelWrapper}>
            <PanelShell
              panelId={panel.id}
              symbol={panel.symbol}
              onClose={() => handleClose(panel.id)}
              onDetach={() => handleDetach(panel.id)}
              onSymbolChange={(s) => handleSymbolChange(panel.id, s)}
            />
          </div>
        ))}
      </ResponsiveGridLayout>

      {/* Restore hidden panels */}
      <div className={styles.hiddenBar}>
        {panels.filter((p) => !p.visible).map((p) => (
          <button
            key={p.id}
            className={styles.restoreBtn}
            onClick={() => setPanels((prev) =>
              prev.map((panel) => panel.id === p.id ? { ...panel, visible: true } : panel)
            )}
          >
            + {p.id.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
};
