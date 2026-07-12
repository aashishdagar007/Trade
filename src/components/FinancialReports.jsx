import React from 'react';
import { useTerminal } from '../data/TerminalContext';

const FinancialReports = () => {
  const { ticker } = useTerminal();

  const financialData = {
    metrics: [
      { label: 'Revenue (TTM)', value: '383.29B', change: '+2.1%', period: 'FY 2023' },
      { label: 'Net Income', value: '97.00B', change: '+3.4%', period: 'FY 2023' },
      { label: 'EPS (Diluted)', value: '6.13', change: '+0.5%', period: 'FY 2023' },
      { label: 'EBITDA', value: '125.82B', change: '+1.2%', period: 'FY 2023' },
      { label: 'Free Cash Flow', value: '106.50B', change: '-1.5%', period: 'FY 2023' },
      { label: 'Gross Margin', value: '44.13%', change: '+0.8%', period: 'FY 2023' },
    ],
    ratios: [
      { label: 'P/E Ratio', value: '29.41', sector: '22.10', status: 'OVER' },
      { label: 'Price/Sales', value: '7.21', sector: '4.50', status: 'OVER' },
      { label: 'Price/Book', value: '42.10', sector: '8.40', status: 'OVER' },
      { label: 'EV/EBITDA', value: '22.50', sector: '18.20', status: 'SIDE' },
      { label: 'ROE (%)', value: '154.20', sector: '45.10', status: 'UP' },
      { label: 'Debt/Equity', value: '1.45', sector: '0.85', status: 'DOWN' },
    ]
  };

  return (
    <div className="flex flex-col h-full bg-black text-white p-4 overflow-auto animate-in zoom-in-95 duration-300">
      <div className="flex justify-between items-center border-b border-[#333] pb-2 mb-4">
        <h2 className="text-xl font-bold text-cyan">{ticker} Financial Insights (CF)</h2>
        <div className="flex gap-4">
          <span className="text-[10px] bg-[#222] px-2 py-0.5 font-bold text-dim">ANNUAL</span>
          <span className="text-[10px] bg-cyan px-2 py-0.5 font-bold text-black cursor-pointer">QUARTERLY</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#0a0a0a] border border-[#222] p-4">
        <div>
          <h3 className="text-amber font-bold text-[10px] tracking-widest mb-3 uppercase">Income Statement Highlights</h3>
          <div className="flex flex-col gap-2">
            {financialData.metrics.map((m, i) => (
              <div key={i} className="flex justify-between items-center text-[11px] group border-b border-[#111] pb-1">
                <span className="text-dim font-bold group-hover:text-white transition-colors">{m.label}</span>
                <div className="flex items-center gap-3">
                  <span className={`font-bold ${m.change.startsWith('+') ? 'text-green' : 'text-red'}`}>{m.change}</span>
                  <span className="text-white font-mono w-16 text-right">{m.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-amber font-bold text-[10px] tracking-widest mb-3 uppercase">Valuation & Ratios</h3>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[9px] text-dim border-b border-[#333]">
                <th className="pb-2">RATIO</th>
                <th className="pb-2 text-right">VALUE</th>
                <th className="pb-2 text-right">SECTOR</th>
              </tr>
            </thead>
            <tbody>
              {financialData.ratios.map((r, i) => (
                <tr key={i} className="text-[11px] border-b border-[#111] hover:bg-[#111]">
                  <td className="py-2 text-dim font-bold">{r.label}</td>
                  <td className="py-2 text-right font-mono text-white">{r.value}</td>
                  <td className="py-2 text-right font-mono text-dim">{r.sector}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        {['EXPORT TO XL', 'REVENUE ANALYTICS', 'SEGMENT DETAIL', 'PEER COMP'].map(btn => (
          <button key={btn} className="flex-1 bg-[#151515] border border-[#333] py-2 text-[9px] font-bold text-dim hover:bg-cyan hover:text-black transition-all">
            {btn}
          </button>
        ))}
      </div>
    </div>
  );
};

export default FinancialReports;
