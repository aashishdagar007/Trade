// electron-app/renderer/App.tsx
/**
 * Root application component.
 *
 * Layout:
 *   ┌─────────────────────────────┐
 *   │  StatusBar (clock + market) │  ← 28px
 *   ├─────────────────────────────┤
 *   │  CommandBar                 │  ← 40px
 *   ├─────────────────────────────┤
 *   │                             │
 *   │  PanelGrid                  │  ← flex 1
 *   │                             │
 *   └─────────────────────────────┘
 *
 * Phase 6 additions:
 *   - useKeyboardNav()  — Tab/Arrow/F-key panel navigation
 *   - useFocusRing()    — keyboard-nav CSS class for visible focus rings
 */

import React, { useState } from "react";
import { CommandBar }      from "./components/CommandBar/CommandBar";
import { PanelGrid }       from "./components/PanelGrid/PanelGrid";
import { ParsedCommand, PanelId } from "./services/commandParser";
import { useKeyboardNav }  from "./hooks/useKeyboardNav";
import { useFocusRing }    from "./hooks/useFocusRing";

export default function App() {
  // Phase 6 — activate keyboard nav + focus ring
  useKeyboardNav();
  useFocusRing();

  const [activeCommand, setActiveCommand] = useState<{
    panel: PanelId; symbol: string | null;
  } | null>(null);

  const handleCommand = (cmd: ParsedCommand) => {
    setActiveCommand({ panel: cmd.panel, symbol: cmd.symbol });
    // Reset so the same command can fire again
    setTimeout(() => setActiveCommand(null), 50);
  };

  return (
    <div className="app-root">
      <StatusBar />
      <CommandBar onCommand={handleCommand} />
      <PanelGrid activeCommand={activeCommand} />
    </div>
  );
}

// ── Status bar ────────────────────────────────────────────────────────────────

function StatusBar() {
  const [time, setTime] = React.useState(new Date());
  React.useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const et = time.toLocaleTimeString("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
  const utc = time.toUTCString().split(" ")[4];

  const isMarketOpen = (() => {
    const now  = new Date(time.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const mins = now.getHours() * 60 + now.getMinutes();
    const dow  = now.getDay();
    return dow >= 1 && dow <= 5 && mins >= 570 && mins < 960; // 9:30–16:00
  })();

  return (
    <div className="status-bar">
      <span className="status-brand">TradePro Terminal</span>
      <div className="status-clocks">
        <Clock label="ET"  time={et}  />
        <Clock label="UTC" time={utc} />
      </div>
      <div className={`status-market ${isMarketOpen ? "market-open" : "market-closed"}`}>
        NYSE {isMarketOpen ? "OPEN" : "CLOSED"}
      </div>
      {/* Phase 6: keyboard shortcut hint */}
      <span className="status-hint">Ctrl+G  F2–F7  Tab</span>
    </div>
  );
}

function Clock({ label, time }: { label: string; time: string }) {
  return (
    <span className="status-clock">
      <span className="clock-label">{label}</span>
      <span className="clock-time">{time}</span>
    </span>
  );
}
