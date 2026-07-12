import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const MoverCard = ({ asset, symbol, change, value, isUp }) => (
  <div className={`p-1.5 border border-[#222] ${isUp ? 'bg-[#003311]/20' : 'bg-[#330011]/20'} flex flex-col justify-between hover:border-[#444] transition-all cursor-pointer group`}>
    <div className="flex justify-between items-start">
      <span className={`text-[8px] font-black uppercase tracking-tighter ${isUp ? 'text-green' : 'text-red'}`}>{asset}</span>
      {isUp ? <TrendingUp size={10} className="text-green" /> : <TrendingDown size={10} className="text-red" />}
    </div>
    <div className="flex flex-col mt-1">
      <span className="text-white font-black text-[10px] group-hover:text-amber">{symbol}</span>
      <div className="flex justify-between items-baseline">
        <span className="text-dim font-mono text-[8px]">{value}</span>
        <span className={`font-mono text-[9px] font-bold ${isUp ? 'text-green' : 'text-red'}`}>
          {isUp ? '▲' : '▼'}{change}%
        </span>
      </div>
    </div>
  </div>
);

const MacroMovers = () => {
  const movers = [
    { section: 'MOST UP', color: 'text-green', items: [
      { asset: 'EQUITY', symbol: 'Czech PX', change: '1.24', value: '1,536.08', isUp: true },
      { asset: 'SOV BONDS', symbol: 'Greece 5Y', change: '5.6bp', value: '1.358', isUp: true },
      { asset: 'COMMO', symbol: 'Coffee NYB', change: '2.31', value: '184.90', isUp: true },
    ]},
    { section: 'MOST DOWN', color: 'text-red', items: [
      { asset: 'EQUITY', symbol: 'Argent MERV', change: '1.52', value: '23,711.20', isUp: false },
      { asset: 'SOV BONDS', symbol: 'Hong Kong 10Y', change: '12.0bp', value: '1.138', isUp: false },
      { asset: 'COMMO', symbol: 'Cotton NYB', change: '4.16', value: '88.12', isUp: false },
    ]}
  ];

  return (
    <div className="flex flex-col h-full bg-[#050505] overflow-hidden">
      <div className="panel-header uppercase tracking-widest text-[#888]">
        GMM GLOBAL MACRO MOVERS
      </div>
      <div className="flex-1 overflow-y-auto p-1.5 scrollbar-hide">
        {movers.map((section, idx) => (
          <div key={idx} className="mb-3 last:mb-0">
            <h4 className={`${section.color} text-[9px] font-black mb-1.5 tracking-widest pl-1`}>{section.section}</h4>
            <div className="grid grid-cols-1 gap-1">
              {section.items.map((item, i) => (
                <MoverCard key={i} {...item} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MacroMovers;
