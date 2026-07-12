import React, { useState } from 'react';
import { useTerminal } from '../data/TerminalContext';
import { Search, ChevronRight, Activity, Bell, Settings, Terminal as TerminalIcon } from 'lucide-react';

const CommandBar = () => {
  const { ticker, executeCommand, activeFunction, commandHistory, isLive } = useTerminal();
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [historyIdx, setHistoryIdx] = useState(-1);

  const FUNCTIONS = ['GP', 'GPO', 'DES', 'CF', 'CN', 'HL', 'SCRM', 'ANR'];
  const TICKERS = ['AAPL', 'TSLA', 'BTC', 'NVDA', 'GOOGL', 'MSFT', 'AMZN', 'META', 'NFLX', 'AMD'];

  const suggestions = [...FUNCTIONS, ...TICKERS].filter(s => 
    s.toLowerCase().startsWith(inputValue.split(' ').pop().toLowerCase()) && 
    inputValue.trim() !== ''
  ).slice(0, 6);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      executeCommand(inputValue);
      setInputValue('');
      setShowSuggestions(false);
      setHistoryIdx(-1);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const nextIdx = historyIdx + 1;
      if (nextIdx < commandHistory.length) {
        setHistoryIdx(nextIdx);
        setInputValue(commandHistory[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = historyIdx - 1;
      if (nextIdx >= 0) {
        setHistoryIdx(nextIdx);
        setInputValue(commandHistory[nextIdx]);
      } else {
        setHistoryIdx(-1);
        setInputValue('');
      }
    }
  };

  return (
    <div className="h-12 bg-[#111] border-b border-[#333] flex items-center px-4 gap-4 select-none z-50">
      <div className="flex items-center gap-2">
        <div className="bg-[#fb9800] p-1 rounded-sm shadow-[0_0_10px_rgba(251,152,0,0.4)]">
          <TerminalIcon size={16} color="black" strokeWidth={3} />
        </div>
        <div className="flex flex-col -gap-1">
          <span className="text-amber font-black text-xs tracking-tighter leading-none">BLOOMBERG</span>
          <span className="text-white font-bold text-[8px] tracking-[0.2em] leading-none opacity-80 uppercase">Terminal</span>
        </div>
      </div>

      <div className="flex-1 max-w-2xl relative">
        <form onSubmit={handleSubmit} className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-amber flex items-center gap-1 z-10">
            <span className="text-[10px] font-bold opacity-50">GO</span>
            <ChevronRight size={14} strokeWidth={3} />
          </div>
          <input
            type="text"
            value={inputValue}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowSuggestions(true);
            }}
            placeholder={`Enter ticker, command, or search (current: ${ticker} ${activeFunction})`}
            className="w-full bg-black border border-[#444] py-1.5 pl-12 pr-4 text-amber font-bold text-sm focus:outline-none focus:border-amber transition-all placeholder:text-[#333] tracking-wide"
          />
        </form>

        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 w-full mt-1 glass border border-[#444] rounded-sm overflow-hidden shadow-2xl z-[100]">
            {suggestions.map((s, i) => (
              <div 
                key={i} 
                className="px-4 py-2 hover:bg-amber hover:text-black text-amber font-bold text-xs cursor-pointer flex justify-between items-center transition-colors border-b border-[#222] last:border-0"
                onClick={() => {
                  const parts = inputValue.split(' ');
                  parts[parts.length - 1] = s;
                  setInputValue(parts.join(' ') + ' ');
                }}
              >
                <span>{s}</span>
                <span className="text-[8px] opacity-50 uppercase tracking-tighter">{FUNCTIONS.includes(s) ? 'Function' : 'Equity'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-6 ml-auto">
        <div className="flex items-center gap-2 px-3 py-1 bg-[#050505] border border-[#222] rounded-full">
          <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : 'bg-red-500'}`} />
          <span className="text-[9px] text-dim font-black tracking-widest">{isLive ? 'LIVE' : 'CONN LOST'}</span>
        </div>
        <div className="flex items-center gap-4 text-dim">
          <Activity size={18} className="hover:text-cyan cursor-pointer transition-colors" />
          <Settings size={18} className="hover:text-white cursor-pointer transition-colors" />
        </div>
        <div className="text-[11px] font-mono font-bold border-l border-[#333] pl-4">
          <span className="text-amber">HKG</span>
          <span className="text-white ml-2">21:52:01</span>
        </div>
      </div>
    </div>
  );
};

export default CommandBar;
