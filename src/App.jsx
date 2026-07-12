import React from 'react';
import { TerminalProvider } from './data/TerminalContext';
import TerminalLayout from './components/TerminalLayout';

function App() {
  return (
    <TerminalProvider>
      <TerminalLayout />
    </TerminalProvider>
  );
}

export default App;
