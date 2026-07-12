import { useState, useEffect, useRef } from 'react';

const mockSecurities = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: 182.52, change: 1.25, pct: 0.69, mktCap: '2.82T', vol: '54.2M' },
  { symbol: 'TSLA', name: 'Tesla, Inc.', price: 171.05, change: -4.32, pct: -2.46, mktCap: '544B', vol: '102.5M' },
  { symbol: 'BTC', name: 'Bitcoin', price: 68421.10, change: 1245.30, pct: 1.85, mktCap: '1.34T', vol: '32.1B' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 875.28, change: 12.45, pct: 1.44, mktCap: '2.19T', vol: '48.9M' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 154.21, change: 0.52, pct: 0.34, mktCap: '1.92T', vol: '22.1M' },
  { symbol: 'MSFT', name: 'Microsoft', price: 421.90, change: -1.20, pct: -0.28, mktCap: '3.13T', vol: '18.5M' },
  { symbol: 'AMZN', name: 'Amazon.com', price: 185.10, change: 2.15, pct: 1.18, mktCap: '1.92T', vol: '31.2M' },
  { symbol: 'META', name: 'Meta Platforms', price: 512.10, change: 8.45, pct: 1.68, mktCap: '1.31T', vol: '15.4M' },
  { symbol: 'NFLX', name: 'Netflix Inc.', price: 610.50, change: -5.20, pct: -0.84, mktCap: '264B', vol: '4.2M' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', price: 170.20, change: 3.10, pct: 1.85, mktCap: '275B', vol: '62.1M' },
  { symbol: 'US10Y', name: 'US 10Y Yield', price: 4.521, change: 0.042, pct: 0.94, mktCap: 'N/A', vol: 'N/A' },
];

export const useMarketData = (ticker) => {
  const [data, setData] = useState(mockSecurities);
  const [currentPrice, setCurrentPrice] = useState(0);
  const dataRef = useRef(mockSecurities);

  useEffect(() => {
    const interval = setInterval(() => {
      const updated = dataRef.current.map(s => {
        const volatility = s.symbol === 'BTC' ? 50 : 0.1;
        const change = (Math.random() - 0.5) * volatility;
        const newPrice = s.price + change;
        const newTotalChange = s.change + change;
        
        return {
          ...s,
          price: newPrice,
          change: newTotalChange,
          pct: (newTotalChange / (newPrice - newTotalChange)) * 100
        };
      });
      dataRef.current = updated;
      setData(updated);
      
      const target = updated.find(s => s.symbol === ticker);
      if (target) {
        setCurrentPrice(target.price);
      } else {
        // Mocking a new ticker if it doesn't exist
        setCurrentPrice(100 + Math.random() * 50);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [ticker]);

  return { securities: data, currentPrice };
};
