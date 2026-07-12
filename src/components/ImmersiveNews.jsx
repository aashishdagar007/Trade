import React from 'react';
import { Newspaper, Info } from 'lucide-react';

const ImmersiveNews = () => {
  return (
    <div className="flex flex-col h-full bg-black overflow-hidden border-t border-[#333]">
      <div className="panel-header text-amber flex items-center gap-2">
         <Newspaper size={10} />
         <span>GLOBAL MACRO NEWS - FIRST WORD</span>
      </div>
      
      <div className="flex-1 p-3 flex flex-col gap-3 overflow-auto scrollbar-hide">
         <div className="flex flex-col gap-1 border-b border-[#222] pb-3">
            <span className="text-amber font-black text-[14px] leading-tight tracking-tight uppercase">
               CATASTROPHE BONDS BRACE FOR DISASTER AS HURRICANE IRMA STRENGTHENS
            </span>
            <div className="flex gap-4 text-[8px] text-dim font-bold uppercase mt-1">
               <span>WIRE: BN</span>
               <span>TIME: 11:52 AM</span>
               <span className="text-red-500 animate-pulse">URGENT</span>
            </div>
         </div>

         <div className="flex-1 text-[9px] text-[#ccc] font-medium leading-relaxed overflow-hidden">
            <p className="mb-2">
               This is shaping up to be the worst month ever for catastrophe bond investors, just as the market was taking off. Catastrophe bonds are an alternative to reinsurance and are increasingly popular for their diversification.
            </p>
            <p className="mb-2 opacity-80">
               They pay guaranteed coupons, so you get high-yield returns and U.S. Treasury levels of volatility. But if they get triggered by a predefined disaster, you lose your principal. The year through June saw record issuance, according to a report from Aon Securities, half of it in ILS.
            </p>
            <p className="opacity-60 text-[8px] italic">
               * Markets await further clarity on Florida landfall impacts later this week.
            </p>
         </div>

         {/* NEWS MINI CHART */}
         <div className="h-20 bg-[#050505] border border-[#222] p-2 flex flex-col relative rounded-sm">
            <div className="flex justify-between items-center mb-1">
               <span className="text-[7px] text-dim font-black uppercase">Bonds Can Lose (Index)</span>
               <span className="text-[8px] text-red font-bold"> -12.4%</span>
            </div>
            <div className="flex-1 flex items-end gap-[1px]">
               {Array.from({length: 30}).map((_, i) => (
                 <div key={i} className="flex-1 bg-red-500/40" style={{ height: `${Math.max(10, Math.random() * 100)}%` }}></div>
               ))}
            </div>
            <div className="absolute top-1/2 left-0 w-full h-[1px] border-t border-dashed border-white/10"></div>
         </div>
      </div>

      <div className="p-1 px-3 bg-[#111] border-t border-[#333] flex items-center gap-3">
         <Info size={10} className="text-blue-400" />
         <span className="text-[7px] text-dim font-bold uppercase tracking-widest">CONTINUED ON PAGE 24 | SOURCE: BBG</span>
      </div>
    </div>
  );
};

export default ImmersiveNews;
