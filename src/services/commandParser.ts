// electron-app/renderer/services/commandParser.ts
/**
 * commandParser — tokenises Bloomberg-style command strings.
 *
 * Supported syntax:
 *   AAPL US <GO>          →  { panel: "chart",     symbol: "AAPL",    action: "load"   }
 *   BTCUSDT <GO>          →  { panel: "chart",     symbol: "BTCUSDT", action: "load"   }
 *   AAPL US NEWS <GO>     →  { panel: "news",      symbol: "AAPL",    action: "load"   }
 *   PORT <GO>             →  { panel: "portfolio", symbol: null,       action: "focus"  }
 *   NEWS <GO>             →  { panel: "news",      symbol: null,       action: "focus"  }
 *   WL <GO>               →  { panel: "watchlist", symbol: null,       action: "focus"  }
 *   OB <GO>               →  { panel: "orderbook", symbol: null,       action: "focus"  }
 *   ALERTS <GO>           →  { panel: "alerts",    symbol: null,       action: "focus"  }
 *   HELP <GO>             →  { panel: "help",      symbol: null,       action: "focus"  }
 *
 * The <GO> suffix is optional — pressing Enter is treated as <GO>.
 */

export type PanelId =
  | "chart"
  | "watchlist"
  | "orderbook"
  | "news"
  | "portfolio"
  | "alerts"
  | "help";

export interface ParsedCommand {
  panel:    PanelId;
  symbol:   string | null;
  action:   "load" | "focus";
  raw:      string;
}

// Panel keyword aliases
const PANEL_KEYWORDS: Record<string, PanelId> = {
  PORT:      "portfolio",
  PORTFOLIO: "portfolio",
  NEWS:      "news",
  WL:        "watchlist",
  WATCH:     "watchlist",
  WATCHLIST: "watchlist",
  OB:        "orderbook",
  ORDERBOOK: "orderbook",
  DEPTH:     "orderbook",
  ALERTS:    "alerts",
  ALERT:     "alerts",
  HELP:      "help",
  "?":       "help",
};

// Tokens that should be stripped (country codes, exchange suffixes)
const NOISE_TOKENS = new Set(["US", "LN", "GY", "JP", "HK", "AU", "CN", "IN"]);

/**
 * Parse a raw command string into a structured ParsedCommand.
 * Returns null if the string cannot be parsed.
 */
export function parseCommand(raw: string): ParsedCommand | null {
  if (!raw || !raw.trim()) return null;

  // Strip <GO> suffix and normalise whitespace
  const cleaned = raw
    .replace(/<GO>/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  if (!cleaned) return null;

  const tokens = cleaned.split(" ");

  // Check if the command is a pure panel keyword (PORT, NEWS, WL …)
  if (tokens.length === 1 && PANEL_KEYWORDS[tokens[0]]) {
    return {
      panel:  PANEL_KEYWORDS[tokens[0]],
      symbol: null,
      action: "focus",
      raw,
    };
  }

  // Look for a panel keyword anywhere in the token list
  let panelToken: PanelId | null = null;
  let symbolTokens: string[]     = [];

  for (const token of tokens) {
    if (PANEL_KEYWORDS[token]) {
      panelToken = PANEL_KEYWORDS[token];
    } else if (!NOISE_TOKENS.has(token)) {
      symbolTokens.push(token);
    }
  }

  // Determine symbol
  const symbol = symbolTokens.length > 0 ? symbolTokens[0] : null;

  // Default panel: chart
  const panel = panelToken ?? "chart";

  // If we have a symbol it's a load action, otherwise focus
  const action = symbol ? "load" : "focus";

  return { panel, symbol, action, raw };
}

/**
 * Generate autocomplete suggestions for a partial command.
 * Returns up to *limit* suggestion strings.
 */
export function getSuggestions(partial: string, limit = 6): string[] {
  const upper = partial.toUpperCase().trim();
  const suggestions: string[] = [];

  // Panel keyword completions
  for (const kw of Object.keys(PANEL_KEYWORDS)) {
    if (kw.startsWith(upper)) {
      suggestions.push(`${kw} <GO>`);
    }
  }

  return suggestions.slice(0, limit);
}
