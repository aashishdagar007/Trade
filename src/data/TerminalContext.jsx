import React, { createContext, useContext, useState } from 'react';

const TerminalContext = createContext();

export const TerminalProvider = ({ children }) => {
  const [ticker, setTicker] = useState('AAPL');
  const [history, setHistory] = useState(['AAPL', 'TSLA', 'BTC', 'NVDA']);
  const [activeFunction, setActiveFunction] = useState('GP');
  const [activeWorkspace, setActiveWorkspace] = useState('TERMINAL');
  const [commandHistory, setCommandHistory] = useState([]);
  const [isLive, setIsLive] = useState(true);

  const VALID_FUNCTIONS = ['GP', 'GPO', 'DES', 'CF', 'CN', 'HL', 'SCRM', 'ANR'];

  const executeCommand = (input) => {
    if (!input) return;
    const cleanInput = input.toUpperCase().trim();
    const parts = cleanInput.split(/\s+/);
    
    // Update history
    setCommandHistory(prev => [cleanInput, ...prev.filter(h => h !== cleanInput)].slice(0, 50));

    let newTicker = ticker;
    let newFunc = activeFunction;

    if (parts.length === 1) {
      if (VALID_FUNCTIONS.includes(parts[0])) {
        newFunc = parts[0];
      } else {
        newTicker = parts[0];
      }
    } else if (parts.length >= 2) {
      newTicker = parts[0];
      newFunc = parts[1];
    }

    if (newTicker !== ticker) {
      updateTicker(newTicker);
    }

    if (VALID_FUNCTIONS.includes(newFunc)) {
      setActiveFunction(newFunc);
      
      // Auto-switch workspace for global functions, but stay in LAUNCHPAD if already there
      if (activeWorkspace !== 'LAUNCHPAD') {
        if (['HL', 'SCRM'].includes(newFunc)) {
          setActiveWorkspace('MARKETS');
        } else {
          setActiveWorkspace('TERMINAL');
        }
      }
    }
  };

  const updateTicker = (newTicker) => {
    const cleanTicker = newTicker.toUpperCase().trim();
    setTicker(cleanTicker);
    setHistory(prev => [cleanTicker, ...prev.filter(t => t !== cleanTicker)].slice(0, 10));
  };

  return (
    <TerminalContext.Provider value={{ 
      ticker, 
      history, 
      updateTicker, 
      activeFunction, 
      setActiveFunction, 
      activeWorkspace,
      setActiveWorkspace,
      executeCommand,
      commandHistory,
      isLive, 
      setIsLive 
    }}>
      {children}
    </TerminalContext.Provider>
  );
};

export const useTerminal = () => useContext(TerminalContext);
