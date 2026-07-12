import React from 'react';
import { useMarketData } from '../hooks/useMarketData';

const MarketHeatmap = () => {
  const { securities } = useMarketData();

  // Exclude non-equity symbols like US10Y
  const equities = securities.filter(s => s.mktCap !== 'N/A');

  const getBgColor = (pct) => {
    if (pct > 2) return 'bg-[#004d1a]';
    if (pct > 0.5) return 'bg-[#00802b]';
    if (pct >= 0) return 'bg-[#1a3322]';
    if (pct > -0.5) return 'bg-[#4d1a1a]';
    if (pct > -2) return 'bg-[#800000]';
    return 'bg-[#b30000]';
  };

  const getBorderColor = (pct) => {
    if (pct > 0) return 'border-[#00ff41]';
    if (pct < 0) return 'border-[#ff073a]';
    return 'border-[#333]';
  };

  return (
    <div className="flex flex-col h-full bg-black p-4 animate-in fade-in zoom-in-95 duration-500 overflow-hidden">
      <div className="flex justify-between items-center mb-4 border-b border-[#333] pb-2">
        <h2 className="text-xl font-black text-white tracking-tighter">MARKET HEATMAP <span className="text-amber font-mono text-sm ml-2">(HL)</span></h2>
        <div className="flex gap-4 text-[10px] font-bold">
          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-[#00ff41]"></div><span>ADVANCING</span></div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-[#ff073a]"></div><span>DECLINING</span></div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 grid-rows-6 gap-1">
        {equities.map((s, i) => {
          // Mocking different grid spans for "Market Cap" feel
          const colSpan = s.symbol === 'AAPL' || s.symbol === 'MSFT' || s.symbol === 'NVDA' ? 'col-span-4' : 
                         s.symbol === 'BTC' || s.symbol === 'AMZN' ? 'col-span-3' : 'col-span-2';
          const rowSpan = s.symbol === 'AAPL' || s.symbol === 'MSFT' ? 'row-span-3' : 
                         s.symbol === 'NVDA' || s.symbol === 'BTC' ? 'row-span-2' : 'row-span-1';

          return (
            <div 
              key={s.symbol}
              className={`${colSpan} ${rowSpan} ${getBgColor(s.pct)} border-t-2 ${getBorderColor(s.pct)} p-2 flex flex-col justify-between hover:scale-[1.02] hover:z-10 transition-all cursor-pointer group shadow-lg`}
            >
              <div className="flex justify-between items-start">
                <span className="text-white font-black text-lg group-hover:text-amber">{s.symbol}</span>
                <span className="text-[10px] font-bold text-white opacity-60">{s.mktCap}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-mono text-white opacity-80">{s.price.toFixed(2)}</span>
                <span className={`text-sm font-black ${s.pct >= 0 ? 'text-[#00ff41]' : 'text-[#ff073a]'}`}>
                  {s.pct >= 0 ? '+' : ''}{s.pct.toFixed(2)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-2 bg-[#111] border border-[#333] flex gap-8">
        <div className="flex flex-col">
          <span className="text-[8px] text-dim font-bold tracking-widest uppercase">Market Breadth</span>
          <div className="flex gap-1 mt-1">
            <div className="h-1 w-24 bg-green-600 rounded-full"></div>
            <div className="h-1 w-12 bg-red-600 rounded-full"></div>
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-[8px] text-dim font-bold tracking-widest uppercase">Volatility Index</span>
          <span className="text-amber font-mono font-bold text-xs mt-1">VIX: 14.25 <span className="text-red">(-1.2%)</span></span>
        </div>
      </div>
    </div>
  );
};

export default MarketHeatmap;
