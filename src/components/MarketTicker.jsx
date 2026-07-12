import React from 'react';
import { useMarketData } from '../hooks/useMarketData';
import { useTerminal } from '../data/TerminalContext';
import { ArrowUp, ArrowDown } from 'lucide-react';

const MarketTicker = () => {
  const { ticker: activeTicker, updateTicker } = useTerminal();
  const { securities } = useMarketData(activeTicker);

  return (
    <div className="flex flex-col h-full bg-[#050505] text-[11px]">
      <div className="bg-[#1a1a1a] px-3 py-1 flex justify-between items-center border-b border-[#333]">
        <span className="font-bold text-white tracking-widest">MARKET WATCH</span>
        <span className="text-[9px] text-amber">REAL-TIME DATA</span>
      </div>
      <div className="overflow-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-[#050505] text-dim font-bold border-b border-[#222]">
            <tr>
              <th className="px-3 py-2">TICKER</th>
              <th className="px-3 py-2 text-right">PRICE</th>
              <th className="px-3 py-2 text-right">CHG</th>
              <th className="px-3 py-2 text-right">%CHG</th>
            </tr>
          </thead>
          <tbody>
            {securities.map((s) => (
              <tr 
                key={s.symbol}
                onClick={() => updateTicker(s.symbol)}
                className={`border-b border-[#111] cursor-pointer transition-colors ${activeTicker === s.symbol ? 'bg-[#121212]' : 'hover:bg-[#111]'}`}
              >
                <td className={`px-3 py-2 font-bold ${activeTicker === s.symbol ? 'text-amber' : 'text-cyan'}`}>
                  {s.symbol}
                </td>
                <td className="px-3 py-2 text-right font-mono font-bold text-white">
                  {s.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className={`px-3 py-2 text-right font-mono font-bold ${s.change >= 0 ? 'text-green' : 'text-red'}`}>
                  {s.change >= 0 ? '+' : ''}{s.change.toFixed(2)}
                </td>
                <td className={`px-3 py-2 text-right font-mono font-bold ${s.pct >= 0 ? 'text-green' : 'text-red'} flex items-center justify-end gap-1`}>
                  {s.pct >= 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                  {Math.abs(s.pct).toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MarketTicker;
