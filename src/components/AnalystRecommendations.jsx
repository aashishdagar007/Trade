import React from 'react';
import { useTerminal } from '../data/TerminalContext';
import { TrendingUp, TrendingDown, Target, Info } from 'lucide-react';

const AnalystRecommendations = () => {
  const { ticker } = useTerminal();

  // Mock sentiment data
  const data = {
    buy: 28,
    hold: 12,
    sell: 3,
    consensus: 'Overweight',
    target: (150 + Math.random() * 100).toFixed(2),
    current: (150 + Math.random() * 100).toFixed(2),
    firms: [
      { name: 'Goldman Sachs', rating: 'Buy', target: 210, date: 'Apr 12' },
      { name: 'Morgan Stanley', rating: 'Overweight', target: 195, date: 'Apr 10' },
      { name: 'JPMorgan', rating: 'Hold', target: 180, date: 'Apr 02' },
      { name: 'Barclays', rating: 'Sell', target: 165, date: 'Mar 28' },
    ]
  };

  const total = data.buy + data.hold + data.sell;

  return (
    <div className="flex flex-col h-full bg-black text-white p-6 overflow-auto animate-in fade-in duration-500">
      <div className="flex justify-between items-end border-b-2 border-amber pb-2 mb-6">
        <div>
          <h2 className="text-2xl font-black text-white tracking-widest uppercase">{ticker} RECOMMENDATIONS</h2>
          <span className="text-dim font-bold text-xs">ANALYST SENTIMENT TRACKER (ANR)</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-amber font-mono font-bold text-lg">{data.consensus}</span>
          <span className="text-[10px] text-dim font-bold uppercase">Consensus Rating</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* SENTIMENT BAR */}
        <div className="lg:col-span-2">
          <h3 className="text-dim font-bold text-[10px] tracking-widest mb-4 uppercase">Consensus Breakdown</h3>
          <div className="h-10 w-full flex rounded-sm overflow-hidden border border-[#333]">
            <div className="bg-[#00ff41] flex items-center justify-center font-black text-black text-xs" style={{ width: `${(data.buy/total)*100}%` }}>BUY</div>
            <div className="bg-amber flex items-center justify-center font-black text-black text-xs" style={{ width: `${(data.hold/total)*100}%` }}>HOLD</div>
            <div className="bg-[#ff073a] flex items-center justify-center font-black text-black text-xs" style={{ width: `${(data.sell/total)*100}%` }}>SELL</div>
          </div>
          <div className="flex justify-between mt-2 text-[10px] font-bold text-dim">
            <span>{data.buy} BUY</span>
            <span>{data.hold} HOLD</span>
            <span>{data.sell} SELL</span>
          </div>
        </div>

        {/* PRICE TARGET */}
        <div className="bg-[#111] p-4 border border-[#333] relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
             <Target size={120} />
          </div>
          <h3 className="text-dim font-bold text-[10px] tracking-widest mb-2 uppercase">Price Target</h3>
          <div className="flex flex-col">
            <span className="text-amber font-mono text-3xl font-black">${data.target}</span>
            <span className="text-[10px] text-green font-bold mt-1">+12.45% Potential Upside</span>
          </div>
        </div>
      </div>

      <div className="flex-1">
        <h3 className="text-dim font-bold text-[10px] tracking-widest mb-4 uppercase">Recent Analyst Actions</h3>
        <div className="flex flex-col gap-2">
          {data.firms.map((firm, i) => (
             <div key={i} className="flex justify-between items-center bg-[#0a0a0a] border border-[#222] p-3 hover:border-amber transition-colors group cursor-pointer">
                <div className="flex flex-col">
                  <span className="text-white font-black text-xs group-hover:text-amber transition-colors">{firm.name}</span>
                  <span className="text-[10px] text-dim font-bold">{firm.date}</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-center">
                    <span className={`text-[11px] font-black uppercase ${firm.rating.includes('Buy') || firm.rating.includes('Over') ? 'text-green' : firm.rating.includes('Hold') ? 'text-amber' : 'text-red'}`}>
                      {firm.rating}
                    </span>
                    <span className="text-[8px] text-dim font-bold">RATING</span>
                  </div>
                  <div className="flex flex-col items-end w-20">
                    <span className="text-white font-mono text-xs font-bold">${firm.target}</span>
                    <span className="text-[8px] text-dim font-bold">TARGET</span>
                  </div>
                </div>
             </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-4 text-[9px] font-bold text-dim p-3 border-t border-[#222]">
        <Info size={14} className="text-amber" />
        <span>Based on 43 independent research analysts covering {ticker} Equity. Financial forecasts are subject to market volatility.</span>
      </div>
    </div>
  );
};

export default AnalystRecommendations;
