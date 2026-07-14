// electron-app/renderer/components/panels/AlertsPanel/AlertsPanel.tsx
/**
 * AlertsPanel — price alert rule manager.
 *
 * Features:
 *   - Add alert rules: symbol + condition (above/below/cross) + threshold
 *   - Rules evaluated against the live wsClient tick stream in real time
 *   - Fired alerts trigger Electron native OS notification via preload bridge
 *   - Alert history (last 50 fired) shown in a scrollable log
 *   - Rules persist in localStorage across sessions
 *   - One-shot alerts auto-disable after firing; optional recurring toggle
 */

import React, {
  useCallback, useEffect, useRef, useState,
} from "react";
import { wsClient, CanonicalTick } from "../../../services/wsClient";
import { Bell, BellOff, Trash2, Plus } from "lucide-react";
import styles from "./AlertsPanel.module.css";

// ─── Types ───────────────────────────────────────────────────────────────────

type Condition = "above" | "below" | "cross_up" | "cross_down";

interface AlertRule {
  id:        string;
  symbol:    string;
  condition: Condition;
  threshold: number;
  label:     string;      // user-readable description
  active:    boolean;     // false once fired (unless recurring)
  recurring: boolean;     // if true, re-arms after firing
  createdAt: number;
}

interface FiredAlert {
  id:        string;
  ruleId:    string;
  symbol:    string;
  price:     number;
  message:   string;
  firedAt:   number;
}

// ─── Persistence ──────────────────────────────────────────────────────────────

const RULES_KEY   = "tradepro:alert-rules";
const HISTORY_KEY = "tradepro:alert-history";
const MAX_HISTORY = 50;

function loadRules(): AlertRule[] {
  try { return JSON.parse(localStorage.getItem(RULES_KEY) || "[]"); } catch { return []; }
}
function saveRules(rules: AlertRule[]) {
  try { localStorage.setItem(RULES_KEY, JSON.stringify(rules)); } catch { /* ignore */ }
}
function loadHistory(): FiredAlert[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
}
function saveHistory(h: FiredAlert[]) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(-MAX_HISTORY))); } catch { /* ignore */ }
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function conditionLabel(c: Condition): string {
  return { above: "↑ Above", below: "↓ Below", cross_up: "⬆ Cross Up", cross_down: "⬇ Cross Down" }[c];
}

function makeMessage(rule: AlertRule, price: number): string {
  return `${rule.symbol} is ${price.toLocaleString()} — ${conditionLabel(rule.condition)} ${rule.threshold.toLocaleString()}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const AlertsPanel: React.FC = () => {
  const [rules,   setRules]   = useState<AlertRule[]>(loadRules);
  const [history, setHistory] = useState<FiredAlert[]>(loadHistory);
  const [tab,     setTab]     = useState<"rules" | "history">("rules");

  // Form state
  const [newSymbol,    setNewSymbol]    = useState("BTCUSDT");
  const [newCondition, setNewCondition] = useState<Condition>("above");
  const [newThreshold, setNewThreshold] = useState("");
  const [newRecurring, setNewRecurring] = useState(false);
  const [formError,    setFormError]    = useState("");

  // Track last known prices for cross detection
  const lastPrices = useRef<Map<string, number>>(new Map());

  // ── Rule evaluation (runs in wsClient callback — must be fast) ─────────────
  const evaluateRule = useCallback(
    (rule: AlertRule, tick: CanonicalTick): boolean => {
      if (!rule.active) return false;
      const price = tick.price;
      const prev  = lastPrices.current.get(tick.symbol);

      switch (rule.condition) {
        case "above":      return price > rule.threshold;
        case "below":      return price < rule.threshold;
        case "cross_up":   return prev != null && prev <= rule.threshold && price > rule.threshold;
        case "cross_down": return prev != null && prev >= rule.threshold && price < rule.threshold;
      }
    },
    []
  );

  // ── Subscribe to all unique symbols in active rules ────────────────────────
  useEffect(() => {
    const activeSymbols = [...new Set(
      rules.filter((r) => r.active).map((r) => r.symbol.toUpperCase())
    )];

    const unsubs = activeSymbols.map((symbol) =>
      wsClient.subscribe(symbol, (tick) => {
        const prev = lastPrices.current.get(symbol);

        setRules((currentRules) => {
          const updated = [...currentRules];
          const fired: FiredAlert[] = [];

          for (let i = 0; i < updated.length; i++) {
            const rule = updated[i];
            if (rule.symbol.toUpperCase() !== symbol) continue;
            if (!rule.active) continue;

            if (evaluateRule(rule, tick)) {
              const message = makeMessage(rule, tick.price);

              // Fire OS notification via browser API
              if (Notification.permission === "granted") {
                new Notification(rule.symbol, { body: message });
              } else if (Notification.permission !== "denied") {
                Notification.requestPermission().then((permission) => {
                  if (permission === "granted") {
                    new Notification(rule.symbol, { body: message });
                  }
                });
              }

              // Record in history
              fired.push({
                id:      crypto.randomUUID(),
                ruleId:  rule.id,
                symbol:  rule.symbol,
                price:   tick.price,
                message,
                firedAt: Date.now(),
              });

              // Deactivate unless recurring
              updated[i] = { ...rule, active: rule.recurring };
            }
          }

          if (fired.length > 0) {
            setHistory((prev) => {
              const next = [...fired, ...prev].slice(0, MAX_HISTORY);
              saveHistory(next);
              return next;
            });
            saveRules(updated);
          }

          return updated;
        });

        lastPrices.current.set(symbol, tick.price);
      })
    );

    return () => unsubs.forEach((u) => u());
  }, [rules.filter((r) => r.active).map((r) => r.symbol).join(","), evaluateRule]);

  // ── Add rule ───────────────────────────────────────────────────────────────
  const handleAddRule = () => {
    setFormError("");
    const thr = parseFloat(newThreshold);
    if (!newSymbol.trim())   { setFormError("Symbol required"); return; }
    if (isNaN(thr) || thr <= 0) { setFormError("Enter a valid price threshold"); return; }

    const rule: AlertRule = {
      id:        crypto.randomUUID(),
      symbol:    newSymbol.trim().toUpperCase(),
      condition: newCondition,
      threshold: thr,
      label:     `${newSymbol.trim().toUpperCase()} ${conditionLabel(newCondition)} ${thr.toLocaleString()}`,
      active:    true,
      recurring: newRecurring,
      createdAt: Date.now(),
    };

    setRules((prev) => {
      const next = [rule, ...prev];
      saveRules(next);
      return next;
    });
    setNewThreshold("");
    setFormError("");
  };

  const toggleRule = (id: string) => {
    setRules((prev) => {
      const next = prev.map((r) => r.id === id ? { ...r, active: !r.active } : r);
      saveRules(next);
      return next;
    });
  };

  const deleteRule = (id: string) => {
    setRules((prev) => {
      const next = prev.filter((r) => r.id !== id);
      saveRules(next);
      return next;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    saveHistory([]);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={styles.root} data-panel-id="alerts">
      {/* Tab bar */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === "rules" ? styles.tabActive : ""}`}
          onClick={() => setTab("rules")}
        >
          Rules ({rules.filter((r) => r.active).length} active)
        </button>
        <button
          className={`${styles.tab} ${tab === "history" ? styles.tabActive : ""}`}
          onClick={() => setTab("history")}
        >
          History ({history.length})
        </button>
      </div>

      {tab === "rules" ? (
        <div className={styles.rulesPane}>
          {/* Add rule form */}
          <div className={styles.form}>
            <div className={styles.formRow}>
              <input
                className={styles.input}
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                placeholder="Symbol (e.g. BTCUSDT)"
                aria-label="Alert symbol"
              />
              <select
                className={styles.select}
                value={newCondition}
                onChange={(e) => setNewCondition(e.target.value as Condition)}
                aria-label="Alert condition"
              >
                <option value="above">↑ Above</option>
                <option value="below">↓ Below</option>
                <option value="cross_up">⬆ Cross Up</option>
                <option value="cross_down">⬇ Cross Down</option>
              </select>
              <input
                className={`${styles.input} ${styles.inputNarrow}`}
                type="number"
                value={newThreshold}
                onChange={(e) => setNewThreshold(e.target.value)}
                placeholder="Price"
                aria-label="Alert threshold price"
                onKeyDown={(e) => e.key === "Enter" && handleAddRule()}
              />
            </div>
            <div className={styles.formRow}>
              <label className={styles.checkLabel}>
                <input
                  type="checkbox"
                  checked={newRecurring}
                  onChange={(e) => setNewRecurring(e.target.checked)}
                />
                Recurring
              </label>
              {formError && <span className={styles.formError}>{formError}</span>}
              <button
                className={styles.addBtn}
                onClick={handleAddRule}
                aria-label="Add alert rule"
              >
                <Plus size={12} /> Add Alert
              </button>
            </div>
          </div>

          {/* Rule list */}
          <div className={styles.list}>
            {rules.length === 0 && (
              <p className={styles.empty}>No alert rules. Add one above.</p>
            )}
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={`${styles.ruleCard} ${!rule.active ? styles.ruleInactive : ""}`}
                data-rule-id={rule.id}
              >
                <div className={styles.ruleMain}>
                  <span className={styles.ruleSym}>{rule.symbol}</span>
                  <span className={styles.ruleCond}>{conditionLabel(rule.condition)}</span>
                  <span className={styles.ruleThr}>
                    {rule.threshold.toLocaleString(undefined, { maximumFractionDigits: 8 })}
                  </span>
                  {rule.recurring && (
                    <span className={styles.recurringBadge}>∞</span>
                  )}
                </div>
                <div className={styles.ruleActions}>
                  <button
                    className={`${styles.iconBtn} ${rule.active ? styles.iconBtnActive : ""}`}
                    onClick={() => toggleRule(rule.id)}
                    title={rule.active ? "Disable" : "Enable"}
                    aria-label={rule.active ? "Disable alert" : "Enable alert"}
                  >
                    {rule.active ? <Bell size={12} /> : <BellOff size={12} />}
                  </button>
                  <button
                    className={`${styles.iconBtn} ${styles.iconBtnDelete}`}
                    onClick={() => deleteRule(rule.id)}
                    title="Delete rule"
                    aria-label="Delete alert rule"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.historyPane}>
          <div className={styles.historyHeader}>
            <span className={styles.historyCount}>{history.length} alerts fired</span>
            <button className={styles.clearBtn} onClick={clearHistory}>Clear all</button>
          </div>
          <div className={styles.list}>
            {history.length === 0 && (
              <p className={styles.empty}>No alerts fired yet.</p>
            )}
            {history.map((h) => (
              <div key={h.id} className={styles.historyCard}>
                <div className={styles.historyTop}>
                  <span className={styles.historySymbol}>{h.symbol}</span>
                  <span className={styles.historyPrice}>
                    {h.price.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                  </span>
                  <span className={styles.historyTs}>
                    {new Date(h.firedAt).toLocaleTimeString()}
                  </span>
                </div>
                <p className={styles.historyMsg}>{h.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
