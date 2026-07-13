import React, { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';
import { marketDataClient } from '../../services/wsClient';

export default function ChartPanel({ symbol }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candlestickSeriesRef = useRef(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 1. Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#0d0e14' },
        textColor: '#6b7280',
      },
      grid: {
        vertLines: { color: '#1e2030' },
        horzLines: { color: '#1e2030' },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: '#1e2030' },
      timeScale: { borderColor: '#1e2030', timeVisible: true },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    // Resize observer
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };
    const ro = new ResizeObserver(handleResize);
    ro.observe(chartContainerRef.current);

    // 2. Fetch history
    setLoading(true);
    fetch(`http://localhost:8000/api/history/${symbol}?interval=1h&limit=500`)
      .then(res => res.json())
      .then(bars => {
        if (!Array.isArray(bars)) return;
        const data = bars.map(b => ({
          time: b.ts / 1000,
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close,
        }));
        candlestickSeries.setData(data);
        chart.timeScale().fitContent();
      })
      .catch(err => console.error("History fetch error:", err))
      .finally(() => setLoading(false));

    // 3. Subscribe to live ticks
    const unsubscribe = marketDataClient.subscribe(symbol, (tick) => {
      if (candlestickSeriesRef.current) {
        try {
          candlestickSeriesRef.current.update({
            time: Math.floor(tick.ts / 1000),
            open: tick.open ?? tick.price,
            high: tick.high ?? tick.price,
            low: tick.low ?? tick.price,
            close: tick.price,
          });
        } catch (e) {
          // ignore out of order ticks
        }
      }
    });

    return () => {
      ro.disconnect();
      unsubscribe();
      chart.remove();
    };
  }, [symbol]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {loading && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10, color: 'white' }}>
          Loading...
        </div>
      )}
      <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
