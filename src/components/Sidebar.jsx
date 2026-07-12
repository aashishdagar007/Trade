import React from 'react';
import { 
  BarChart2, 
  Globe, 
  Newspaper, 
  MessageSquare, 
  LayoutGrid, 
  Briefcase, 
  TrendingUp,
  Cpu
} from 'lucide-react';

const Sidebar = () => {
  const items = [
    { icon: LayoutGrid, label: 'WSPACE', active: true },
    { icon: BarChart2, label: 'CHART' },
    { icon: TrendingUp, label: 'TRADE' },
    { icon: Newspaper, label: 'NEWS' },
    { icon: MessageSquare, label: 'IB' },
    { icon: Briefcase, label: 'PORT' },
    { icon: Globe, label: 'ECON' },
    { icon: Cpu, label: 'ALGO' },
  ];

  return (
    <div className="w-16 bg-[#0a0a0a] border-r border-[#333] flex flex-col items-center py-4 gap-6 select-none">
      {items.map((item, index) => (
        <div 
          key={index} 
          className={`group flex flex-col items-center gap-1 cursor-pointer transition-all ${item.active ? 'text-amber' : 'text-dim hover:text-white'}`}
        >
          <item.icon size={22} strokeWidth={item.active ? 2.5 : 2} />
          <span className="text-[8px] font-bold tracking-widest">{item.label}</span>
          {item.active && (
            <div className="absolute left-0 w-1 h-6 bg-amber rounded-r-full" />
          )}
        </div>
      ))}
    </div>
  );
};

export default Sidebar;
