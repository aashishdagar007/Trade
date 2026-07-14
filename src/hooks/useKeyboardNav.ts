// electron-app/renderer/hooks/useKeyboardNav.ts
/**
 * useKeyboardNav — terminal-wide keyboard navigation hook.
 *
 * Provides:
 *   1. Tab / Shift+Tab  — cycle focus between panels (by data-panel-id)
 *   2. Arrow keys       — navigate within the focused panel's focusable items
 *   3. F-key shortcuts  — focus a specific panel by ID (mirrors main.js globals)
 *   4. Escape           — blur current element, focus command bar
 *
 * Usage:
 *   Call useKeyboardNav() once at the App root.
 *   Panels must have data-panel-id="<panelId>" on their root element.
 *   Focusable items inside a panel must have data-focusable="true".
 */

import { useEffect, useCallback } from "react";
import { PanelId } from "../services/commandParser";

// Ordered panel cycle for Tab navigation
const PANEL_ORDER: PanelId[] = [
  "chart", "watchlist", "orderbook", "news", "portfolio", "alerts",
];

// F-key → panel mapping (mirrors main.js globalShortcut registrations)
const FKEY_MAP: Record<string, PanelId> = {
  F2: "chart",
  F3: "watchlist",
  F4: "orderbook",
  F5: "news",
  F6: "portfolio",
  F7: "alerts",
};

/**
 * Queries all panels visible in the current DOM (they may be in a detached
 * window or hidden, so we filter by offsetParent !== null).
 */
function getVisiblePanels(): Element[] {
  return Array.from(
    document.querySelectorAll("[data-panel-id]")
  ).filter((el) => (el as HTMLElement).offsetParent !== null);
}

function getFocusableItems(panel: Element): HTMLElement[] {
  return Array.from(
    panel.querySelectorAll<HTMLElement>(
      "[data-focusable='true'], button:not([disabled]), " +
      "input:not([disabled]), select:not([disabled]), " +
      "a[href], [tabindex]:not([tabindex='-1'])"
    )
  ).filter((el) => el.offsetParent !== null);
}

function getCurrentPanelIndex(panels: Element[]): number {
  const active = document.activeElement;
  if (!active) return -1;
  return panels.findIndex((p) => p.contains(active));
}

export function useKeyboardNav() {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const panels = getVisiblePanels();
    if (!panels.length) return;

    // ── F-key → focus panel ───────────────────────────────────────────────
    if (e.key in FKEY_MAP) {
      const targetId = FKEY_MAP[e.key];
      const target   = panels.find(
        (p) => p.getAttribute("data-panel-id") === targetId
      ) as HTMLElement | undefined;
      if (target) {
        e.preventDefault();
        const items = getFocusableItems(target);
        (items[0] ?? target).focus();
        return;
      }
    }

    // ── Tab / Shift+Tab — cycle between panels ────────────────────────────
    if (e.key === "Tab" && !e.altKey && !e.metaKey) {
      // Only intercept if the active element is inside a panel
      const currentIdx = getCurrentPanelIndex(panels);
      if (currentIdx === -1) return;   // let browser handle Tab outside panels

      e.preventDefault();
      const delta = e.shiftKey ? -1 : 1;
      const nextIdx = (currentIdx + delta + panels.length) % panels.length;
      const nextPanel = panels[nextIdx] as HTMLElement;
      const items = getFocusableItems(nextPanel);
      (items[0] ?? nextPanel).focus();
      return;
    }

    // ── Arrow keys — navigate within focused panel ────────────────────────
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      const currentIdx = getCurrentPanelIndex(panels);
      if (currentIdx === -1) return;

      const panel = panels[currentIdx];
      const items = getFocusableItems(panel);
      if (!items.length) return;

      const activeItemIdx = items.indexOf(document.activeElement as HTMLElement);
      if (activeItemIdx === -1) {
        e.preventDefault();
        items[0].focus();
        return;
      }

      const delta    = e.key === "ArrowDown" ? 1 : -1;
      const nextItem = items[activeItemIdx + delta];
      if (nextItem) {
        e.preventDefault();
        nextItem.focus();
      }
      return;
    }

    // ── Escape — blur, focus command bar ─────────────────────────────────
    if (e.key === "Escape") {
      const cmdBar = document.getElementById("command-bar-input");
      if (cmdBar) {
        (document.activeElement as HTMLElement)?.blur();
        // Don't auto-focus cmdBar here — let CommandBar's own Escape handler
        // deal with clearing it. Only focus if nothing else handles it.
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [handleKeyDown]);
}
