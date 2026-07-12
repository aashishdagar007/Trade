import React, { useState } from 'react';
import { Send, User, Users } from 'lucide-react';

const initialMessages = [
  { id: 1, user: 'S. CHEN', msg: 'Checking in on the Nikkei move. Anyone seeing the spread widening?', time: '11:50' },
  { id: 2, user: 'M. ROSS', msg: 'Likely some liquidity issues at the open. Watching the 38k level closely.', time: '11:51' },
];

const IBMessage = () => {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const newMsg = {
      id: Date.now(),
      user: 'ME (TERMINAL)',
      msg: input.toUpperCase(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages([...messages, newMsg]);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] border-t border-[#333]">
      <div className="bg-[#121212] px-3 py-1 flex justify-between items-center border-b border-[#333]">
        <div className="flex items-center gap-2">
          <Users size={12} className="text-amber" />
          <span className="font-bold text-white tracking-widest text-[10px]">IB - INSTANT BLOOMBERG</span>
        </div>
        <span className="text-[9px] text-green font-bold">142 ONLINE</span>
      </div>

      <div className="flex-1 overflow-auto p-3 flex flex-col gap-3">
        {messages.map((m) => (
          <div key={m.id} className="flex flex-col gap-0.5">
            <div className="flex justify-between items-center">
              <span className={`text-[9px] font-bold ${m.user.startsWith('ME') ? 'text-amber' : 'text-cyan'}`}>{m.user}</span>
              <span className="text-[8px] text-dim">{m.time}</span>
            </div>
            <p className="text-[10px] text-[#ddd] leading-tight select-text">{m.msg}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} className="p-2 border-t border-[#222] flex gap-2">
        <input 
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="SEND MESSAGE..."
          className="flex-1 bg-black border border-[#333] text-[10px] p-1 text-white focus:outline-none focus:border-amber uppercase"
        />
        <button type="submit" className="text-amber hover:text-white transition-colors">
          <Send size={14} />
        </button>
      </form>
    </div>
  );
};

export default IBMessage;
