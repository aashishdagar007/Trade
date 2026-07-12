import React, { useState, useEffect } from 'react';

const MarketData = ({ symbol }) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8000/ws/market-data/${symbol.toLowerCase()}`);

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'market_data') {
        setData(message.data);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }, [symbol]);

  if (!data) {
    return <div className="market-data">Loading {symbol}...</div>;
  }

  const price = parseFloat(data.c);
  const changePercent = parseFloat(data.P);

  return (
    <div className="market-data">
      <h2>{symbol}</h2>
      <div className="price">${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</div>
      <div className={`change ${changePercent >= 0 ? 'positive' : 'negative'}`}>
        {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
      </div>
    </div>
  );
};

export default MarketData;