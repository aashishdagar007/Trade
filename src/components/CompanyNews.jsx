import React, { useState, useEffect } from 'react';
import { useTerminal } from '../data/TerminalContext';
import { Clock, ExternalLink, Filter } from 'lucide-react';

const CompanyNews = () => {
  const { ticker } = useTerminal();
  const [news, setNews] = useState([]);

  useEffect(() => {
    // Generate ticker-specific mock news
    const tickerNews = [
      { id: 1, time: '12:05', source: 'BN', headline: `${ticker} ANNOUNCES Q3 EARNINGS DATE; ANALYSTS EXPECT BEAT`, category: 'Earnings' },
      { id: 2, time: '11:42', source: 'REU', headline: `EXCLUSIVE: ${ticker} POTENTIALLY EXPLORING STRATEGIC PARTNERSHIP IN SE ASIA`, category: 'M&A' },
      { id: 3, time: '10:15', source: 'BBG', headline: `${ticker} CEO SPEAKS AT GLOBAL TECHNOLOGY SUMMIT ON FUTURE INNOVATIONS`, category: 'Management' },
      { id: 4, time: '09:30', source: 'CNBC', headline: `UPGRADE: ${ticker} RAISED TO 'BUY' AT GOLDMAN SACHS; TP $${(Math.random() * 100 + 150).toFixed(2)}`, category: 'Analyst' },
      { id: 5, time: '08:45', source: 'WSJ', headline: `${ticker} SUPPLY CHAIN OPTIMIZATION EFFORTS STARTING TO YIELD RESULTS`, category: 'Operations' },
      { id: 6, time: 'Prev', source: 'BN', headline: `${ticker} ANNOUNCES NEW SUSTAINABILITY TARGETS FOR 2030`, category: 'ESG' },
      { id: 7, time: 'Prev', source: 'BBG', headline: `MARKET WRAP: ${ticker} OUTPERFORMS PEERS DESPITE MACRO HEADWINDS`, category: 'Market' },
    ];
    setNews(tickerNews);
  }, [ticker]);

  return (
    <div className="flex flex-col h-full bg-[#050505] text-white overflow-hidden animate-in slide-in-from-right duration-300">
      <div className="bg-[#121212] px-4 py-2 flex justify-between items-center border-b border-[#333]">
        <div className="flex items-center gap-2">
          <span className="font-bold text-amber tracking-widest text-[12px]">{ticker} CORPORATE NEWS (CN)</span>
          <span className="text-[9px] bg-red-600 px-1 text-white font-bold animate-pulse">LIVE UPDATE</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-dim font-bold">
          <Filter size={12} className="cursor-pointer hover:text-white" />
          <span>SORT: LATEST</span>
        </div>
      </div>

      <div className="overflow-auto flex-1 p-4 scrollbar-hide">
        {news.map((item) => (
          <div 
            key={item.id} 
            className="group flex flex-col gap-1 py-4 border-b border-[#222] hover:bg-[#111] cursor-pointer transition-colors px-2"
          >
            <div className="flex justify-between items-center mb-1">
              <div className="flex gap-2 items-center">
                <span className="text-[10px] font-mono text-amber font-bold">{item.time}</span>
                <span className="text-[10px] font-bold text-dim">{item.source}</span>
                <span className="text-[8px] bg-[#222] px-1.5 py-0.5 rounded text-dim group-hover:bg-amber group-hover:text-black transition-colors uppercase font-bold tracking-tighter">
                  {item.category}
                </span>
              </div>
              <ExternalLink size={12} className="text-dim opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h3 className="text-[13px] font-bold leading-snug text-[#eee] tracking-tight group-hover:text-amber transition-colors">
              {item.headline}
            </h3>
          </div>
        ))}

        <div className="py-6 text-center">
          <button className="text-[10px] font-bold text-amber hover:underline tracking-widest uppercase opacity-50 hover:opacity-100">
            --- LOAD HISTORICAL ARCHIVE ---
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanyNews;
