import React from 'react';
import { useTerminal } from '../data/TerminalContext';

const CompanyDescription = () => {
  const { ticker } = useTerminal();

  // Mock data for company description
  const companyData = {
    'AAPL': {
      name: 'Apple Inc.',
      sector: 'Technology',
      industry: 'Consumer Electronics',
      employees: '161,000',
      ceo: 'Tim Cook',
      summary: 'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide. The company offers iPhone, Mac, iPad, and wearables, home, and accessories. It also provides AppleCare support services; cloud services; and operates various platforms, including the App Store, that allow customers to discover and download applications and digital content.'
    },
    'TSLA': {
      name: 'Tesla, Inc.',
      sector: 'Consumer Discretionary',
      industry: 'Automobile Components',
      employees: '140,473',
      ceo: 'Elon Musk',
      summary: 'Tesla, Inc. designs, develops, manufactures, leases, and sells electric vehicles, and energy generation and storage systems in the United States, China, and internationally. The company operates in two segments: Automotive, and Energy Generation and Storage. Tesla’s mission is to accelerate the world’s transition to sustainable energy.'
    },
    'DEFAULT': {
      name: `${ticker} Corporation`,
      sector: 'Global Markets',
      industry: 'Diversified Financials',
      employees: 'N/A',
      ceo: 'N/A',
      summary: `Detailed description for ${ticker} is currently loading from global data providers. This security is listed on major exchanges and represents a key constituent of relevant market indices.`
    }
  };

  const data = companyData[ticker] || companyData['DEFAULT'];

  return (
    <div className="flex flex-col h-full bg-black text-white p-4 overflow-auto animate-in fade-in duration-300">
      <div className="flex items-baseline gap-4 border-b border-amber pb-2 mb-4">
        <h1 className="text-2xl font-bold text-amber">{data.name}</h1>
        <span className="text-dim font-bold text-sm tracking-widest">{ticker} Equity (DES)</span>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-6">
        <div className="flex flex-col gap-3">
          <div className="flex justify-between border-b border-[#222] py-1">
            <span className="text-dim text-[11px] font-bold">SECTOR</span>
            <span className="text-white text-[11px] font-mono">{data.sector}</span>
          </div>
          <div className="flex justify-between border-b border-[#222] py-1">
            <span className="text-dim text-[11px] font-bold">INDUSTRY</span>
            <span className="text-white text-[11px] font-mono">{data.industry}</span>
          </div>
          <div className="flex justify-between border-b border-[#222] py-1">
            <span className="text-dim text-[11px] font-bold">EMPLOYEES</span>
            <span className="text-white text-[11px] font-mono">{data.employees}</span>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex justify-between border-b border-[#222] py-1">
            <span className="text-dim text-[11px] font-bold">CEO</span>
            <span className="text-white text-[11px] font-mono uppercase">{data.ceo}</span>
          </div>
          <div className="flex justify-between border-b border-[#222] py-1">
            <span className="text-dim text-[11px] font-bold">EXCHANGE</span>
            <span className="text-white text-[11px] font-mono">NASDAQ</span>
          </div>
          <div className="flex justify-between border-b border-[#222] py-1">
            <span className="text-dim text-[11px] font-bold">CURRENCY</span>
            <span className="text-white text-[11px] font-mono">USD</span>
          </div>
        </div>
      </div>

      <div className="bg-[#0a0a0a] p-4 border-l-2 border-amber">
        <h2 className="text-amber font-bold text-xs tracking-widest mb-2">BUSINESS SUMMARY</h2>
        <p className="text-[12px] leading-relaxed text-[#ccc] font-medium italic">
          {data.summary}
        </p>
      </div>

      <div className="mt-8 grid grid-cols-4 gap-4">
        {['MANAGEMENT', 'COMPETITORS', 'SEGMENTS', 'OWNERSHIP'].map(item => (
          <div key={item} className="bg-[#111] py-2 text-center text-[10px] font-bold text-dim border border-[#222] hover:bg-[#222] hover:text-white cursor-pointer transition-colors">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CompanyDescription;
