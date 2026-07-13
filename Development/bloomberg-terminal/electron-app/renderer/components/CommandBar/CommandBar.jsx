import { useState, useEffect, useRef } from 'react';

/**
 * Parses BBG-style command syntax:
 *   'AAPL US<GO>'   -> equity chart for AAPL
 *   'BTC USDT<GO>'  -> crypto chart for BTCUSDT
 *   'NEWS<GO>'      -> opens a news panel (no symbol)
 * <GO> can be typed literally or triggered by pressing Enter -- both work,
 * since typing <GO> is the authentic muscle memory but Enter is what
 * everyone actually does day to day.
 */

const FUNCTIONS = {
  GIP: 'chart',   // intraday chart, mirrors real BBG's GIP function
  NEWS: 'news',
  WATCH: 'watchlist',
  PORT: 'portfolio',
};

function parseCommand(raw) {
  const cleaned = raw.replace(/<GO>/i, '').trim().toUpperCase();
  const parts = cleaned.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return null;

  // pure function call, e.g. 'NEWS' or 'WATCH'
  if (parts.length === 1 && FUNCTIONS[parts[0]]) {
    return { type: FUNCTIONS[parts[0]], symbol: null };
  }

  // 'AAPL US' -> equity, 'BTC USDT' -> crypto
  const [symbolPart, suffix] = parts;
  if (suffix === 'US') {
    return { type: 'chart', symbol: symbolPart, assetClass: 'equity' };
  }
  const cryptoQuotes = ['USDT', 'BUSD', 'USDC', 'BTC', 'ETH'];
  if (cryptoQuotes.includes(suffix)) {
    return { type: 'chart', symbol: `${symbolPart}${suffix}`, assetClass: 'crypto' };
  }

  // bare symbol, no suffix -- let the backend's /api/search resolve it
  return { type: 'chart', symbol: symbolPart, assetClass: null };
}

export default function CommandBar({ onCommand }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    // Ctrl+K from the Electron main process focuses this from anywhere
    window.terminalAPI?.onFocusCommandBar(() => inputRef.current?.focus());
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      const parsed = parseCommand(value);
      if (parsed) onCommand(parsed);
      setValue('');
    }
  };

  return (
    <div className="command-bar">
      <span className="command-bar__prompt">&gt;</span>
      <input
        ref={inputRef}
        className="command-bar__input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="AAPL US<GO>  /  BTC USDT<GO>  /  NEWS<GO>"
        spellCheck={false}
        autoFocus
      />
    </div>
  );
}
