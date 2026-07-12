import React from 'react';

const RegionalPerformance = () => {
  const regions = [
    { name: 'North America', value: 37, color: '#00ff41' },
    { name: 'Western Europe', value: 24, color: '#fb9800' },
    { name: 'Asia Pacific', value: 28, color: '#00d4ff' },
    { name: 'Emerging Markets', value: 11, color: '#ff073a' },
  ];

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden border-t border-[#333]">
      <div className="panel-header text-dim">
        DMAP INTRA-DAY RETURN BY REGION
      </div>
      <div className="flex-1 flex flex-col p-3 items-center justify-center gap-4">
        {/* MOCK DONUT USING CONIC GRADIENT */}
        <div className="relative w-28 h-28 rounded-full border border-[#222] shadow-[0_0_20px_rgba(0,0,0,0.5)]" 
             style={{ 
               background: `conic-gradient(
                 #00ff41 0% 37%, 
                 #fb9800 37% 61%, 
                 #00d4ff 61% 89%, 
                 #ff073a 89% 100%
               )` 
             }}>
          <div className="absolute inset-[15%] bg-black rounded-full flex flex-col items-center justify-center border border-[#111]">
             <span className="text-[14px] font-black text-white leading-none">0.73%</span>
             <span className="text-[7px] text-dim font-bold uppercase tracking-widest mt-0.5">Global</span>
          </div>
        </div>

        <div className="w-full grid grid-cols-2 gap-2">
          {regions.map(r => (
            <div key={r.name} className="flex items-center gap-1.5">
               <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: r.color }}></div>
               <div className="flex flex-col">
                  <span className="text-[8px] text-white font-bold opacity-80 uppercase leading-none">{r.name}</span>
                  <span className="text-[9px] font-mono font-black" style={{ color: r.color }}>+{r.value / 10}%</span>
               </div>
            </div>
          ))}
        </div>
      </div>
      <div className="p-1 text-center bg-[#111] border-t border-[#222]">
         <span className="text-[8px] text-dim font-bold tracking-widest uppercase">37,969 SECURITIES TRACKED</span>
      </div>
    </div>
  );
};

export default RegionalPerformance;
