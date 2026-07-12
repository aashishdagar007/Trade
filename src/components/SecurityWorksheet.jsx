import React from 'react';
import { useMarketData } from '../hooks/useMarketData';

const Sparkline = ({ data, color }) => {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 60;
  const height = 14;
  
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        points={points}
      />
    </svg>
  );
};

const SecurityWorksheet = () => {
  const { securities } = useMarketData();

  // Mocking 20 rows for density
  const displayItems = [...securities, ...securities].slice(0, 24);

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden border-r border-[#333]">
      <div className="panel-header flex justify-between">
        <span className="text-white">MY SECURITY WORKSHEET: 186 STOXX 600 MOVERS</span>
        <div className="flex gap-2">
           <span className="text-amber">Options</span>
           <span className="text-dim">View</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto scrollbar-hide">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-[#0a0a0a] z-10 text-[8px] font-black text-dim tracking-widest border-b border-[#222]">
            <tr>
              <th className="p-1 px-2">TICKER</th>
              <th className="p-1">PRICE</th>
              <th className="p-1">%1D</th>
              <th className="p-1">VOL</th>
              <th className="p-1 text-center">INTRA-DAY</th>
            </tr>
          </thead>
          <tbody>
            {displayItems.map((s, i) => {
              const mockSparkData = Array.from({length: 12}, () => Math.random() * 100);
              const color = s.pct >= 0 ? '#00ff41' : '#ff073a';
              
              return (
                <tr key={`${s.symbol}-${i}`} className="border-b border-[#111] hover:bg-[#111] group cursor-pointer h-5">
                  <td className="p-1 px-2 text-amber text-[9px] font-black">{s.symbol}</td>
                  <td className="p-1 text-white font-mono text-[9px]">{s.price.toFixed(2)}</td>
                  <td className={`p-1 font-mono text-[9px] ${s.pct >= 0 ? 'text-green' : 'text-red'}`}>
                    {s.pct >= 0 ? '+' : ''}{s.pct.toFixed(2)}
                  </td>
                  <td className="p-1 text-dim text-[8px]">{s.vol}</td>
                  <td className="p-1 flex justify-center items-center">
                    <Sparkline data={mockSparkData} color={color} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="p-1 bg-[#111] border-t border-[#333] flex justify-between text-[7px] text-dim font-bold">
         <span>FILTER: GLOBAL EQ</span>
         <span>REFRESH: 2S</span>
      </div>
    </div>
  );
};

export default SecurityWorksheet;
