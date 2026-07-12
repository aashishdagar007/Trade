import React, { useState, useEffect } from 'react';
import { Sun, Cloud, Moon, CloudRain } from 'lucide-react';

const Clock = ({ city, timezone, temp, icon: Icon }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = time.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: timezone
  });

  const formattedDate = time.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    timeZone: timezone
  });

  return (
    <div className="flex flex-col border-r border-[#333] px-6 py-2 last:border-r-0">
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-white font-black text-2xl tracking-tighter font-mono">{formattedTime}</span>
        <span className="text-[9px] text-dim font-bold uppercase tracking-widest">{formattedDate}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-amber font-black text-[11px] uppercase tracking-tighter">{city}</span>
        <div className="flex items-center gap-2">
          <Icon size={12} className="text-dim" />
          <span className="text-white font-mono text-[10px]">{temp}°</span>
        </div>
      </div>
    </div>
  );
};

const InternationalClocks = () => {
  return (
    <div className="bg-black border-b border-[#333] flex overflow-x-auto scrollbar-hide select-none transition-all hover:bg-[#050505]">
      <Clock city="New York" timezone="America/New_York" temp="76" icon={Sun} />
      <Clock city="London" timezone="Europe/London" temp="16" icon={Cloud} />
      <Clock city="Hong Kong" timezone="Asia/Hong_Kong" temp="31" icon={Moon} />
      <Clock city="Tokyo" timezone="Asia/Tokyo" temp="25" icon={CloudRain} />
      
      <div className="ml-auto flex items-center px-4 gap-6 border-l border-[#333]">
         <div className="flex flex-col items-end">
            <span className="text-[8px] text-dim font-black uppercase tracking-widest leading-none mb-1">System Load</span>
            <div className="flex gap-0.5">
               {[1,1,1,1,0.6,0.3,0.1].map((v, i) => (
                 <div key={i} className="w-1.5 h-3 bg-green-500/20 relative rounded-sm overflow-hidden">
                    <div className="absolute bottom-0 left-0 w-full bg-green-500" style={{ height: `${v*100}%` }}></div>
                 </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
};

export default InternationalClocks;
