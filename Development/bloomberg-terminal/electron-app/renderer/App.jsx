import { useState } from 'react';
import CommandBar from './components/CommandBar/CommandBar';
import PanelGrid from './components/PanelGrid/PanelGrid';
import './styles.css';

export default function App() {
  const [panels, setPanels] = useState([]);

  const handleCommand = (parsed) => {
    setPanels((prev) => [
      ...prev,
      {
        id: `${parsed.type}-${parsed.symbol || 'x'}-${Date.now()}`,
        type: parsed.type,
        symbol: parsed.symbol,
        assetClass: parsed.assetClass,
      },
    ]);
  };

  return (
    <div className="terminal">
      <CommandBar onCommand={handleCommand} />
      <PanelGrid panels={panels} />
    </div>
  );
}
