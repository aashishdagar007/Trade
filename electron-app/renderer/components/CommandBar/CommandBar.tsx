// electron-app/renderer/components/CommandBar/CommandBar.tsx
/**
 * CommandBar — Bloomberg-style command input at the top of the terminal.
 *
 * Behaviour:
 *   - Ctrl+G (or F-key → main process → IPC) focuses the input
 *   - Typing parses suggestions in real time via commandParser
 *   - Enter (or clicking <GO>) fires the parsed command
 *   - Escape clears and blurs
 */

import React, {
  useCallback, useEffect, useRef, useState,
} from "react";
import { parseCommand, getSuggestions, ParsedCommand } from "../../services/commandParser";
import styles from "./CommandBar.module.css";

interface CommandBarProps {
  onCommand: (cmd: ParsedCommand) => void;
}

export const CommandBar: React.FC<CommandBarProps> = ({ onCommand }) => {
  const [value,       setValue]       = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSug,     setShowSug]     = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── IPC shortcut listener ─────────────────────────────────────────────────
  useEffect(() => {
    if (!window.electronAPI) return;
    const unsub = window.electronAPI.onShortcut(({ key }) => {
      if (key === "command-bar" || key === "escape") {
        if (key === "escape") {
          setValue("");
          setSuggestions([]);
          setShowSug(false);
          inputRef.current?.blur();
        } else {
          inputRef.current?.focus();
          inputRef.current?.select();
        }
      }
    });
    return unsub;
  }, []);

  // ── Input handlers ─────────────────────────────────────────────────────────
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setValue(v);
    const sugs = getSuggestions(v);
    setSuggestions(sugs);
    setShowSug(sugs.length > 0);
  }, []);

  const fire = useCallback((raw: string) => {
    const cmd = parseCommand(raw);
    if (cmd) {
      onCommand(cmd);
      setValue("");
      setSuggestions([]);
      setShowSug(false);
      inputRef.current?.blur();
    }
  }, [onCommand]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { fire(value); return; }
    if (e.key === "Escape") {
      setValue(""); setSuggestions([]); setShowSug(false);
      inputRef.current?.blur();
    }
  }, [value, fire]);

  const handleSuggestionClick = (sug: string) => {
    setValue(sug);
    fire(sug);
  };

  return (
    <div className={styles.wrapper}>
      {/* Amber indicator dot */}
      <span className={styles.indicator} aria-hidden />

      <input
        ref={inputRef}
        id="command-bar-input"
        className={styles.input}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setShowSug(false), 150)}
        onFocus={() => value && setShowSug(suggestions.length > 0)}
        placeholder="Type symbol + <GO> …  e.g. AAPL US <GO>"
        autoComplete="off"
        spellCheck={false}
        aria-label="Command bar"
        aria-autocomplete="list"
        aria-expanded={showSug}
      />

      <button
        className={styles.goBtn}
        onClick={() => fire(value)}
        tabIndex={-1}
        aria-label="Execute command"
      >
        GO
      </button>

      {/* Autocomplete dropdown */}
      {showSug && (
        <ul className={styles.suggestions} role="listbox" aria-label="Suggestions">
          {suggestions.map((sug) => (
            <li
              key={sug}
              role="option"
              className={styles.suggestion}
              onMouseDown={() => handleSuggestionClick(sug)}
            >
              {sug}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
