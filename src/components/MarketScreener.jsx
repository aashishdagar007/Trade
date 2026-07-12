import React, { useState } from 'react';
import { useMarketData } from '../hooks/useMarketData';
import { ArrowUp, ArrowDown, Search, Filter } from 'lucide-react';

const MarketScreener = () => {
  const { securities } = useMarketData();
  const [sortField, setSortField] = useState('pct');
  const [sortDir, setSortDir] = useState('desc');

  const sortedSecurities = [...securities].sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];
    if (typeof valA === 'string') return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    return sortDir === 'asc' ? valA - valB : valB - valA;
  });

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  return (
    <div className="flex flex-col h-full bg-black animate-in slide-in-from-bottom duration-500 overflow-hidden">
      <div className="bg-[#111] border-b border-[#333] px-4 py-2 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-white font-black text-sm tracking-widest">ADVANCED SCREENER <span className="text-amber font-mono">(SCRM)</span></h2>
          <div className="flex gap-2">
            {['EQUITY', 'CRYPTO', 'GOVT', 'FX'].map(tab => (
              <span key={tab} className={`text-[9px] font-bold px-2 py-0.5 cursor-pointer rounded-sm ${tab === 'EQUITY' ? 'bg-amber text-black' : 'text-dim hover:text-white transition-colors'}`}>
                {tab}
              </span>
            ))}
          </div>
        </div>
        <div className="flex gap-4 text-dim items-center">
          <Search size={14} className="hover:text-amber cursor-pointer" />
          <Filter size={14} className="hover:text-amber cursor-pointer" />
          <span className="text-[10px] font-bold">TOTAL: {securities.length} SECURITIES</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto scrollbar-hide">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-[#050505] z-10 shadow-xl">
            <tr className="border-b border-[#222]">
              {[
                { label: 'SYMBOL', field: 'symbol' },
                { label: 'NAME', field: 'name' },
                { label: 'PRICE', field: 'price' },
                { label: 'CHANGE', field: 'change' },
                { label: '% CHG', field: 'pct' },
                { label: 'MKT CAP', field: 'mktCap' },
                { label: 'VOLUME', field: 'vol' },
              ].map(col => (
                <th 
                  key={col.field}
                  className="px-4 py-3 text-[10px] font-black text-dim tracking-widest cursor-pointer hover:text-amber transition-colors"
                  onClick={() => toggleSort(col.field)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {sortField === col.field && (
                      sortDir === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedSecurities.map((s, i) => (
              <tr key={s.symbol} className={`border-b border-[#111] hover:bg-[#111] transition-colors group ${i % 2 === 0 ? 'bg-black' : 'bg-[#050505]'}`}>
                <td className="px-4 py-3 text-amber font-black text-xs">{s.symbol}</td>
                <td className="px-4 py-3 text-white font-bold text-[11px] truncate max-w-[150px]">{s.name}</td>
                <td className="px-4 py-3 text-white font-mono text-xs">{s.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td className={`px-4 py-3 font-mono text-xs ${s.change >= 0 ? 'text-green' : 'text-red'}`}>
                  {s.change >= 0 ? '+' : ''}{s.change.toFixed(2)}
                </td>
                <td className="px-4 py-3">
                   <div className={`px-2 py-0.5 rounded-sm inline-block font-mono text-[10px] font-bold ${s.pct >= 0 ? 'bg-[#003311] text-[#00ff41]' : 'bg-[#330011] text-[#ff073a]'}`}>
                    {s.pct >= 0 ? '+' : ''}{s.pct.toFixed(2)}%
                   </div>
                </td>
                <td className="px-4 py-3 text-dim font-bold text-[10px]">{s.mktCap}</td>
                <td className="px-4 py-3 text-dim font-bold text-[10px]">{s.vol}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-[#111] border-t border-[#333] px-4 py-1.5 flex justify-between items-center text-[9px] font-bold text-dim">
        <span>LAST UPDATE: {new Date().toLocaleTimeString()}</span>
        <div className="flex gap-4">
          <span className="text-amber">EXPORT TO XL</span>
          <span className="hover:text-white cursor-pointer transition-colors">PRINT SNAPSHOT</span>
        </div>
      </div>
    </div>
  );
};

export default MarketScreener;
