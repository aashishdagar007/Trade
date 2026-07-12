import React from 'react';
import CommandBar from './CommandBar';
import Sidebar from './Sidebar';
import MarketTicker from './MarketTicker';
import TerminalChart from './TerminalChart';
import NewsFeed from './NewsFeed';
import EconomicIndicators from './EconomicIndicators';
import IBMessage from './IBMessage';
import MarketHeatmap from './MarketHeatmap';
import MarketScreener from './MarketScreener';
import AnalystRecommendations from './AnalystRecommendations';
import GraphicDashboard from './GraphicDashboard';
import InternationalClocks from './InternationalClocks';
import MacroMovers from './MacroMovers';
import RegionalPerformance from './RegionalPerformance';
import SecurityWorksheet from './SecurityWorksheet';
import ImmersiveNews from './ImmersiveNews';
import { useTerminal } from '../data/TerminalContext';

const TerminalLayout = () => {
  const { activeFunction, activeWorkspace, setActiveWorkspace } = useTerminal();

  const renderMainPanel = () => {
    switch (activeFunction) {
      case 'DES': return <CompanyDescription />;
      case 'CF': return <FinancialReports />;
      case 'CN': return <CompanyNews />;
      case 'ANR': return <AnalystRecommendations />;
      case 'HL': return <MarketHeatmap />;
      case 'SCRM': return <MarketScreener />;
      case 'GPO':
      case 'GP':
      default: return <TerminalChart />;
    }
  };

  const renderLaunchpad = () => (
    <div className="flex flex-col h-full bg-[#111] gap-[1px]">
      <InternationalClocks />
      <div className="flex-1 grid grid-cols-12 grid-rows-6 gap-[1px] min-h-0 min-w-0">
        {/* ROW 1-6: Left Panel - Very Dense Worksheet */}
        <div className="col-span-3 row-span-6 bg-black flex flex-col min-h-0">
           <SecurityWorksheet />
        </div>
        
        {/* ROW 1-4: Center Top - Movers & Graphic Dashboard */}
        <div className="col-span-3 row-span-4 bg-black flex flex-col min-h-0 border-l border-[#333]">
           <MacroMovers />
        </div>

        <div className="col-span-6 row-span-4 bg-black flex flex-col min-h-0 border-l border-[#333]">
           <GraphicDashboard />
        </div>

        {/* ROW 5-6: Center Bottom - Immersive News & Distribution */}
        <div className="col-span-6 row-span-2 bg-black flex flex-col min-h-0 mt-[1px] border-l border-[#333] border-t border-[#333]">
           <ImmersiveNews />
        </div>

        <div className="col-span-3 row-span-2 bg-black flex flex-col min-h-0 mt-[1px] border-l border-[#333] border-t border-[#333]">
           <RegionalPerformance />
        </div>
      </div>
    </div>
  );

  const isGlobalView = ['HL', 'SCRM'].includes(activeFunction);
  return (
    <div className="flex flex-col h-screen w-screen bg-black select-none overflow-hidden relative">
      {/* CRT OVERLAYS */}
      <div className="crt-overlay" />
      <div className="crt-vignette" />

      {/* TOP HEADER */}
      <div className="flex flex-col">
        <CommandBar />
        
        {/* WORKSPACE TABS */}
        <div className="h-7 bg-[#0a0a0a] border-b border-[#333] flex items-center px-4 gap-1">
          {[
            { id: 'TERMINAL', label: '1-TERMINAL', active: activeWorkspace === 'TERMINAL' },
            { id: 'MARKETS', label: '2-GLOBAL MARKETS', active: activeWorkspace === 'MARKETS' },
            { id: 'LAUNCHPAD', label: '3-LAUNCHPAD', active: activeWorkspace === 'LAUNCHPAD' },
          ].map(tab => (
            <div 
              key={tab.id}
              onClick={() => setActiveWorkspace(tab.id)}
              className={`px-4 h-full flex items-center text-[10px] font-black cursor-pointer transition-all border-r border-[#222] ${
                tab.active ? 'bg-amber text-black' : 'text-dim hover:bg-[#151515] hover:text-white'
              }`}
            >
              {tab.label}
            </div>
          ))}
          <div className="ml-auto flex items-center gap-4 text-[9px] font-bold text-dim">
            <span className="animate-pulse text-green">● SYSTEM READY</span>
            <span className="opacity-50">v4.2.0-STABLE</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0 min-w-0">
        {/* LEFT NAVIGATION - Hidden in Launchpad mode */}
        {activeWorkspace !== 'LAUNCHPAD' && (
          <div className="w-[180px] shrink-0 border-r border-[#333]">
             <Sidebar title="Main Navigation" />
          </div>
        )}

        {/* MAIN WORKSPACE AREA */}
        <main id="terminal-workspace" className="flex-grow bg-[#111] overflow-hidden min-h-0 min-w-0 relative h-full">
          
          {activeWorkspace === 'LAUNCHPAD' ? (
             <div className="h-full w-full">
                {renderLaunchpad()}
             </div>
          ) : isGlobalView ? (
             <div className="absolute inset-0 z-10 bg-black">
                {renderMainPanel()}
             </div>
          ) : (
            <div 
              className="grid gap-[1px] bg-[#333] h-full w-full"
              style={{ 
                gridTemplateColumns: '2.5fr 6fr 3.5fr', 
                gridTemplateRows: 'repeat(6, 1fr)',
              }}
            >
              {/* WATCHLIST - LEFT PANEL */}
              <div id="panel-watchlist"
                  className="bg-black min-h-0 overflow-hidden flex flex-col border-r border-[#333]"
                  style={{ gridColumn: '1', gridRow: '1 / span 6' }}>
                <MarketTicker />
              </div>

              {/* MAIN CENTER TOP - CHART OR DATA */}
              <div id="panel-main"
                  className="bg-black min-h-0 overflow-hidden flex flex-col"
                  style={{ gridColumn: '2', gridRow: '1 / span 4' }}>
                {renderMainPanel()}
              </div>

              {/* MAIN CENTER BOTTOM - NEWS */}
              <div id="panel-news"
                  className="bg-black min-h-0 overflow-hidden flex flex-col border-t border-[#333]"
                  style={{ gridColumn: '2', gridRow: '5 / span 2' }}>
                <NewsFeed />
              </div>

              {/* RIGHT TOP - ECONOMIC DATA */}
              <div id="panel-econ"
                  className="bg-black min-h-0 overflow-hidden flex flex-col border-l border-[#333]"
                  style={{ gridColumn: '3', gridRow: '1 / span 3' }}>
                <EconomicIndicators />
              </div>

              {/* RIGHT BOTTOM - IB CHAT */}
              <div id="panel-ib"
                  className="bg-black min-h-0 overflow-hidden flex flex-col border-l border-[#333] border-t border-[#333]"
                  style={{ gridColumn: '3', gridRow: '4 / span 3' }}>
                <IBMessage />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* FOOTER TAPE - DUAL STREAM */}
      <div className="h-8 bg-[#000] border-t border-[#333] flex flex-col overflow-hidden select-none">
        {/* STREAM 1: INDICES (SLOW) */}
        <div className="flex-1 flex items-center px-4 gap-8 whitespace-nowrap border-b border-[#111] animate-flux">
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[8px] font-black text-white/50">S&P 500</span>
            <span className="text-[9px] font-mono font-bold text-green">5,210.42 +12.31 (+0.24%)</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[8px] font-black text-white/50">NASDAQ</span>
            <span className="text-[9px] font-mono font-bold text-green">16,306.64 +45.10 (+0.28%)</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[8px] font-black text-white/50">DAX 40</span>
            <span className="text-[9px] font-mono font-bold text-red">18,175.20 -4.50 (-0.02%)</span>
          </div>
          <div className="flex items-center gap-1 animate-[marquee_25s_linear_infinite] shrink-0 ml-auto">
            <span className="text-[9px] font-bold text-amber tracking-widest">FIXED INCOME: US 10Y @ 4.52% (▲1.2bp) | JPN 10Y @ 0.85% (▼0.5bp) | GER 10Y @ 2.45% (▲0.8bp)</span>
          </div>
        </div>

        {/* STREAM 2: GLOBAL NEWS (FAST) */}
        <div className="flex-1 flex items-center px-4 bg-[#050505] overflow-hidden">
           <div className="animate-[marquee-fast_40s_linear_infinite] whitespace-nowrap flex gap-12 items-center">
              {[
                "UK INFLATION COOLS TO 3.2% IN MARCH",
                "ECB DATA SIGNALS JUNE RATE CUT REMAINS ON TRACK",
                "NIKKEI 225 GAINS 0.5% ON TECH STRENGTH",
                "GLOBAL SHIPPING COSTS STABILIZE",
                "US RETAIL SALES BEAT EXPECTATIONS BY 0.3%"
              ].map((news, i) => (
                <div key={i} className="flex items-center gap-2">
                   <div className="w-1 h-1 bg-amber rounded-full"></div>
                   <span className="text-[8px] font-black text-dim tracking-tighter uppercase whitespace-nowrap">{news}</span>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};

export default TerminalLayout;
