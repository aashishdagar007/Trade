// electron-app/renderer/hooks/useFocusRing.ts
/**
 * useFocusRing — applies a CSS class to the document root when the user
 * is navigating by keyboard, enabling visible focus rings only for
 * keyboard users (not mouse clicks).
 *
 * Sets:  document.body.classList.add("keyboard-nav")
 * Clears: on any mouse click
 *
 * The global.css `.keyboard-nav` class then enables :focus-visible rings.
 */

import { useEffect } from "react";

export function useFocusRing() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "F2",
           "F3", "F4", "F5", "F6", "F7"].includes(e.key)) {
        document.body.classList.add("keyboard-nav");
      }
    };
    const onMouse = () => document.body.classList.remove("keyboard-nav");

    window.addEventListener("keydown",   onKey,   { capture: true });
    window.addEventListener("mousedown", onMouse, { capture: true });

    return () => {
      window.removeEventListener("keydown",   onKey,   { capture: true });
      window.removeEventListener("mousedown", onMouse, { capture: true });
    };
  }, []);
}
