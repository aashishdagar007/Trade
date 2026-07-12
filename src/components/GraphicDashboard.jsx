import React from 'react';
import { useTerminal } from '../data/TerminalContext';
import { BarChart2, TrendingUp, UserCheck, ShieldCheck } from 'lucide-react';

const MetricBadge = ({ label, value, color }) => (
  <div className="flex flex-col border border-[#222] bg-[#0a0a0a] p-1 h-full min-w-[50px] justify-center items-center">
    <span className="text-[7px] text-dim font-black uppercase tracking-widest leading-none mb-1">{label}</span>
    <span className={`text-[10px] font-black ${color || 'text-white'}`}>{value}</span>
  </div>
);

const GraphicDashboard = () => {
  const { ticker } = useTerminal();

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden animate-in fade-in zoom-in-95 duration-700">
      <div className="panel-header flex justify-between">
        <span className="text-white">GD GRAPHIC DASHBOARD - {ticker} EQUITY</span>
        <div className="flex gap-2 text-[8px] text-dim uppercase">
           <span>Page 1</span>
           <span className="text-amber">Options</span>
        </div>
      </div>

      <div className="flex-1 p-2 flex flex-col gap-2 overflow-auto scrollbar-hide">
        {/* TOP SUMMARY ROW */}
        <div className="flex gap-2 h-16 shrink-0">
          <div className="flex flex-col flex-1 bg-[#111] p-2 border-l-2 border-amber">
            <span className="text-[8px] text-white/50 font-bold uppercase tracking-widest">Pricing Snap</span>
            <div className="flex items-baseline gap-2">
              <span className="text-white font-black text-2xl tracking-tighter">$182.52</span>
              <span className="text-green text-[10px] font-bold">+1.24%</span>
            </div>
            <span className="text-[7px] text-dim font-bold">BID 182.50 | ASK 182.55 | VOL 54.2M</span>
          </div>
          
          <div className="grid grid-cols-3 gap-1">
             <MetricBadge label="Beta" value="1.14" color="text-cyan" />
             <MetricBadge label="Vol 3M" value="23.4%" color="text-amber" />
             <MetricBadge label="Div Yld" value="0.52%" color="text-green" />
          </div>
        </div>

        {/* MOCK CHARTING ROW */}
        <div className="flex-1 flex gap-2 min-h-0">
           {/* MINI CHART 1 */}
           <div className="flex-1 border border-[#222] bg-[#050505] p-1 flex flex-col relative overflow-hidden">
              <div className="flex justify-between items-center mb-1">
                 <span className="text-[8px] text-dim font-black uppercase">Relative Perf</span>
                 <BarChart2 size={10} className="text-amber" />
              </div>
              <div className="flex-1 flex items-end gap-[2px]">
                 {[0.4, 0.6, 0.45, 0.8, 0.9, 0.75, 1, 0.85, 0.6, 0.88, 1, 0.92, 0.7, 0.8].map((h, i) => (
                   <div key={i} className="flex-1 bg-green-500/80 hover:bg-green-400 transition-all rounded-t-sm" style={{ height: `${h * 100}%` }}></div>
                 ))}
              </div>
              <div className="absolute top-8 left-0 w-full h-[1px] bg-white/10"></div>
           </div>

           {/* MINI CHART 2 */}
           <div className="flex-1 border border-[#222] bg-[#050505] p-1 flex flex-col relative">
              <div className="flex justify-between items-center mb-1">
                 <span className="text-[8px] text-dim font-black uppercase">Sentiment Flow</span>
                 <TrendingUp size={10} className="text-green" />
              </div>
              <svg className="flex-1 w-full" viewBox="0 0 100 40">
                <path d="M 0 35 Q 15 20 30 25 T 60 10 T 100 20" fill="none" stroke="#00d4ff" strokeWidth="1.5" />
                <path d="M 0 35 Q 15 20 30 25 T 60 10 T 100 20 V 40 H 0 Z" fill="url(#grad)" opacity="0.2" />
                <defs>
                   <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#00d4ff', stopOpacity: 1 }} />
                      <stop offset="100%" style={{ stopColor: '#00d4ff', stopOpacity: 0 }} />
                   </linearGradient>
                </defs>
              </svg>
           </div>
        </div>

        {/* RANKINGS & GAUGES SECTION */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 h-26 shrink-0">
           <div className="lg:col-span-1 border border-[#222] bg-[#0a0a0a] p-2 flex flex-col items-center justify-center relative overflow-hidden">
              <span className="text-[7px] text-dim font-black uppercase mb-1">Consensus Rating</span>
              <div className="relative w-12 h-6 border-t-4 border-amber rounded-t-full flex items-end justify-center">
                 <div className="absolute w-1 h-6 bg-white origin-bottom rotate-[45deg] bottom-0 left-1/2 -ml-0.5"></div>
              </div>
              <span className="text-amber font-black text-xs mt-1">4.21</span>
              <span className="text-[6px] text-green font-bold">OUTPERFORM</span>
           </div>

           <div className="lg:col-span-1 border border-[#222] bg-[#0a0a0a] p-2 flex flex-col gap-1">
              <span className="text-[7px] text-dim font-black uppercase mb-1">Valuation Matrix</span>
              <div className="grid grid-cols-2 grid-rows-2 gap-[1px] bg-[#333] flex-1">
                 <div className="bg-[#002200] flex items-center justify-center text-[7px] text-green">P/E</div>
                 <div className="bg-[#220000] flex items-center justify-center text-[7px] text-red">P/B</div>
                 <div className="bg-[#002222] flex items-center justify-center text-[7px] text-cyan">EV</div>
                 <div className="bg-[#222200] flex items-center justify-center text-[7px] text-amber">D/E</div>
              </div>
           </div>

           <div className="lg:col-span-2 border border-[#222] bg-[#0a0a0a] p-2 flex flex-col gap-1.5 overflow-hidden">
              <div className="flex items-center gap-1">
                 <UserCheck size={10} className="text-amber" />
                 <span className="text-[8px] font-black uppercase text-dim">Peer Ranking</span>
              </div>
              <div className="flex flex-col gap-1">
                 {[
                   { name: 'AAPL', rank: 1, val: 'Top' },
                   { name: 'MSFT', rank: 2, val: 'High' }
                 ].map(r => (
                   <div key={r.name} className="flex justify-between items-center text-[8px]">
                      <span className="text-white font-bold">{r.name}</span>
                      <div className="flex-1 border-b border-dotted border-white/10 mx-2 mb-1"></div>
                      <span className="text-green">{r.val}</span>
                   </div>
                 ))}
              </div>
           </div>
        </div>

        <div className="grid grid-cols-3 gap-1 h-8 shrink-0">
           {['EPS: 6.42', 'P/E: 28.4', 'BYLD: 1.2%'].map(m => (
             <div key={m} className="bg-[#111] border border-[#222] flex items-center justify-center text-[8px] font-black text-white/50">{m}</div>
           ))}
        </div>
      </div>
    </div>
  );
};

export default GraphicDashboard;
