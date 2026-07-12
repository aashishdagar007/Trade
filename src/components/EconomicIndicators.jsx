import React from 'react';

const indicators = [
  { group: 'USA', name: 'GDP Growth (QoQ)', value: '3.2%', status: 'UP', date: 'Mar 28' },
  { group: 'USA', name: 'CPI (YoY)', value: '3.5%', status: 'UP', date: 'Apr 10' },
  { group: 'USA', name: 'Unemployment', value: '3.8%', status: 'DOWN', date: 'Apr 05' },
  { group: 'USA', name: 'Fed Funds Rate', value: '5.50%', status: 'SIDE', date: 'Mar 20' },
  { group: 'EU', name: 'ECB Refi Rate', value: '4.50%', status: 'SIDE', date: 'Apr 11' },
  { group: 'EU', name: 'HICP (YoY)', value: '2.4%', status: 'DOWN', date: 'Apr 03' },
  { group: 'CHN', name: 'GDP (YoY)', value: '5.2%', status: 'SIDE', date: 'Jan 16' },
  { group: 'JPN', name: 'BoJ Rate', value: '0.10%', status: 'UP', date: 'Mar 19' },
  { group: 'USA', name: 'Debt to GDP', value: '124%', status: 'UP', date: 'Dec 31' },
  { group: 'UK', name: 'Base Rate', value: '5.25%', status: 'SIDE', date: 'Mar 21' },
];

const EconomicIndicators = () => {
  const calendar = [
    { time: '08:30', name: 'Non-Farm Payrolls', surv: '200k', act: '275k', prior: '229k', s: 'UP' },
    { time: '08:30', name: 'Unemployment Rate', surv: '3.7%', act: '3.9%', prior: '3.7%', s: 'DOWN' },
    { time: '10:00', name: 'ISM Manufacturing', surv: '49.5', act: '47.8', prior: '49.1', s: 'DOWN' },
    { time: '10:00', name: 'Consumer Sent.', surv: '76.5', act: '76.9', prior: '76.5', s: 'UP' },
    { time: 'Prev', name: 'ADP Employment', surv: '150k', act: '140k', prior: '107k', s: 'DOWN' },
    { time: 'Prev', name: 'JOLTS Job Openings', surv: '8.8M', act: '8.9M', prior: '8.9M', s: 'SIDE' },
  ];

  return (
    <div className="flex flex-col h-full bg-black overflow-hidden border-l border-[#333]">
      <div className="panel-header text-cyan flex justify-between">
        <span>ECO ECONOMIC CALENDAR</span>
        <span className="text-[8px] text-dim">SURV(M) ACTUAL</span>
      </div>
      
      <div className="flex-1 overflow-auto scrollbar-hide">
        <table className="w-full text-[8px] font-bold border-collapse">
          <thead>
            <tr className="text-dim border-b border-[#222]">
              <th className="p-1 px-2 text-left">TIME</th>
              <th className="p-1 text-left">EVENT</th>
              <th className="p-1 text-right">SURV</th>
              <th className="p-1 text-right">ACT</th>
              <th className="p-1 text-right">PRIOR</th>
            </tr>
          </thead>
          <tbody>
            {calendar.map((item, i) => (
              <tr key={i} className="border-b border-[#111] hover:bg-[#111] group cursor-pointer">
                <td className="p-1 px-2 text-amber">{item.time}</td>
                <td className="p-1 text-white group-hover:text-amber truncate max-w-[80px]">{item.name}</td>
                <td className="p-1 text-right text-dim">{item.surv}</td>
                <td className={`p-1 text-right ${item.s === 'UP' ? 'text-green' : item.s === 'DOWN' ? 'text-red' : 'text-white'}`}>
                  {item.act}
                </td>
                <td className="p-1 text-right text-dim opacity-50">{item.prior}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="p-2 mt-2">
           <div className="flex justify-between items-center mb-1.5 px-1">
              <span className="text-[9px] font-black text-white tracking-widest uppercase">Yield Curve</span>
              <span className="text-[7px] text-green animate-pulse">● LIVE</span>
           </div>
           <div className="flex flex-col gap-1 bg-[#0a0a0a] p-1.5 border border-[#222]">
              {[
                { l: 'US 2Y', v: '4.91%', c: '+1.2bp' },
                { l: 'US 10Y', v: '4.52%', c: '-0.5bp' },
                { l: 'US 30Y', v: '4.61%', c: '-2.1bp' }
              ].map(y => (
                <div key={y.l} className="flex justify-between items-center px-1">
                   <div className="flex gap-2">
                      <span className="text-dim w-10">{y.l}</span>
                      <span className="text-white font-mono">{y.v}</span>
                   </div>
                   <span className={y.c.startsWith('+') ? 'text-green' : 'text-red'}>{y.c}</span>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};

export default EconomicIndicators;
