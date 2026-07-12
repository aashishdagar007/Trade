import React, { useState, useEffect } from 'react';
import './App.css';
import MarketData from './components/MarketData';
import PriceChart from './components/PriceChart';
import AccountInfo from './components/AccountInfo';
import OrderForm from './components/OrderForm';
import StrategyDeployer from './components/StrategyDeployer';

function App() {
  const [symbol, setSymbol] = useState('BTCUSDT');

  return (
    <div className="app">
      <header className="app-header">
        <h1>TradePro</h1>
        <div className="status-bar">
          <span>Connected to Binance</span>
        </div>
      </header>

      <main className="app-main">
        <div className="left-panel">
          <MarketData symbol={symbol} />
          <PriceChart symbol={symbol} />
        </div>

        <div className="right-panel">
          <AccountInfo />
          <OrderForm symbol={symbol} />
          <StrategyDeployer symbol={symbol} />
        </div>
      </main>

      <footer className="app-footer">
        <p>TradePro - Professional Trading Platform</p>
        <p>Data provided by Binance</p>
      </footer>
    </div>
  );
}

export default App;