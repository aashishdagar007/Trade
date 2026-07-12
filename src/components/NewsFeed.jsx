import React, { useState, useEffect } from 'react';
import { useTerminal } from '../data/TerminalContext';
import { Clock, ExternalLink } from 'lucide-react';

const mockNews = [
  { id: 1, time: '11:45', source: 'BN', headline: 'FED OFFICIALS SIGNAL CAUTION ON RATE CUTS AMID STICKY INFLATION', urgent: true },
  { id: 2, time: '11:42', source: 'REU', headline: 'APPLE TO UNVEIL NEW AI CHIPS IN UPCOMING MACBOOK REFRESH', urgent: false },
  { id: 3, time: '11:38', source: 'BBG', headline: 'GLOBAL OIL PRICES STABILIZE AS MIDDLE EAST TENSIONS EASE SLIGHTLY', urgent: false },
  { id: 4, time: '11:30', source: 'CNBC', headline: 'US TREASURY YIELDS CLIMB TO 4.5% AS LABOR DATA REMAINS STRONG', urgent: true },
  { id: 5, time: '11:25', source: 'BN', headline: 'TOKYO STOCKS CLOSE HIGHER ON WEAK YEN AND EXPORT OPTIMISM', urgent: false },
  { id: 6, time: '11:15', source: 'WSJ', headline: 'TESLA Q1 DELIVERIES MISS ESTIMATES; COMPETITION IN CHINA INTENSIFIES', urgent: true },
  { id: 7, time: '11:02', source: 'FT', headline: 'ECB PREPARES FOR JUNE RATE CUT AS EUROZONE INFLATION COOLS', urgent: false },
  { id: 8, time: '10:55', source: 'BBG', headline: 'CRYPTO MARKET CAP REGAINS $2.5T LEVEL AS BITCOIN LEDS RECOVERY', urgent: false },
];

const NewsFeed = () => {
  const { ticker } = useTerminal();
  const [news, setNews] = useState(mockNews);

  useEffect(() => {
    // Simulate new news arriving
    const interval = setInterval(() => {
      const newStory = {
        id: Date.now(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'BN',
        headline: ticker === 'AAPL' ? `BREAKING: ANALYSTS RAISE ${ticker} PRICE TARGET TO $220` : `MARKET ALERT: HIGH VOLUME RECORDED IN ${ticker} OPTIONS`,
        urgent: Math.random() > 0.7
      };
      setNews(prev => [newStory, ...prev.slice(0, 15)]);
    }, 15000);

    return () => clearInterval(interval);
  }, [ticker]);

  return (
    <div className="flex flex-col h-full bg-[#050505] border-t border-[#333]">
      <div className="bg-[#121212] px-3 py-1 flex justify-between items-center border-b border-[#333]">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white tracking-widest text-[11px]">WIRE / NEWS</span>
          <span className="text-[9px] bg-red-600 px-1 text-white font-bold animate-pulse">LIVE</span>
        </div>
        <div className="flex items-center gap-4 text-[9px] text-dim font-bold">
          <span>SOURCE: ALLW</span>
          <span>LANG: EN</span>
        </div>
      </div>
      <div className="overflow-auto flex-1 p-2">
        {news.map((item) => (
          <div 
            key={item.id} 
            className={`flex gap-3 py-2 border-b border-[#111] hover:bg-[#111] cursor-pointer group transition-colors px-1 ${item.urgent ? 'border-l-2 border-l-red-600' : ''}`}
          >
            <span className="text-[10px] font-mono text-amber font-bold shrink-0">{item.time}</span>
            <span className="text-[10px] font-bold text-dim shrink-0">{item.source}</span>
            <div className="flex flex-col gap-1">
              <h3 className={`text-[11px] font-bold leading-tight ${item.urgent ? 'text-white' : 'text-[#ddd]'} tracking-tight group-hover:text-amber`}>
                {item.headline}
              </h3>
              {item.urgent && (
                <span className="text-[8px] text-red-500 font-bold tracking-widest">* * URGENT * *</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewsFeed;
