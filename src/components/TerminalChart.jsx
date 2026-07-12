import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, CandlestickSeries, AreaSeries, BarSeries } from 'lightweight-charts';
import { useTerminal } from '../data/TerminalContext';

const TerminalChart = () => {
  const chartContainerRef = useRef();
  const { ticker, activeFunction } = useTerminal();

  useEffect(() => {
    if (!chartContainerRef.current) return;

    let chart;
    try {
      const container = chartContainerRef.current;
      const width = container.clientWidth || 600;
      const height = container.clientHeight || 400;

      chart = createChart(container, {
        layout: {
          background: { type: ColorType.Solid, color: '#000000' },
          textColor: '#888',
          fontSize: 10,
          fontFamily: 'JetBrains Mono, Roboto Mono, monospace',
        },
        grid: {
          vertLines: { color: '#0a0a0a' },
          horzLines: { color: '#0a0a0a' },
        },
        width: width,
        height: height,
        rightPriceScale: {
          borderVisible: false,
          scaleMargins: { top: 0.2, bottom: 0.2 },
        },
        timeScale: {
          borderVisible: false,
          timeVisible: true,
          secondsVisible: false,
        },
        crosshair: {
          vertLine: { color: '#444', labelBackgroundColor: '#fb9800' },
          horzLine: { color: '#444', labelBackgroundColor: '#fb9800' },
        }
      });

      let series;
      if (activeFunction === 'GPO') {
        series = chart.addSeries(BarSeries, {
          upColor: '#00ff41',
          downColor: '#ff073a',
        });
      } else {
        series = chart.addSeries(AreaSeries, {
          lineColor: '#fb9800',
          topColor: 'rgba(251, 152, 0, 0.4)',
          bottomColor: 'rgba(251, 152, 0, 0.0)',
          lineWidth: 2,
        });
      }

      // Generate mock data
      const generateData = () => {
        const data = [];
        let time = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
        let value = 150;
        for (let i = 0; i < 100; i++) {
          const open = value + (Math.random() - 0.5) * 10;
          const high = open + Math.random() * 5;
          const low = open - Math.random() * 5;
          const close = (high + low) / 2 + (Math.random() - 0.5) * 4;
          
          if (activeFunction === 'GPO') {
            data.push({
              time: (time.getTime() / 1000),
              open,
              high,
              low,
              close,
            });
          } else {
            data.push({
              time: (time.getTime() / 1000),
              value: close,
            });
          }
          
          time = new Date(time.getTime() + 24 * 60 * 60 * 1000);
          value = close;
        }
        return data;
      };

      const chartData = generateData();
      series.setData(chartData);

      // Add markers for pro feel
      series.setMarkers([
        { time: chartData[chartData.length - 15].time, position: 'aboveBar', color: '#00ff41', shape: 'arrowUp', text: 'BUY' },
        { time: chartData[chartData.length - 5].time, position: 'belowBar', color: '#ff073a', shape: 'arrowDown', text: 'SELL' },
      ]);

      const handleResize = () => {
        if (chart && container) {
          chart.applyOptions({ 
            width: container.clientWidth,
            height: container.clientHeight,
          });
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (chart) chart.remove();
      };
    } catch (err) {
      console.error("Chart initialization failed:", err);
    }
  }, [ticker, activeFunction]);

  return (
    <div className="flex flex-col h-full bg-black relative">
       <div className="absolute top-2 left-4 z-10 flex flex-col pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="text-amber font-bold text-lg select-none">{ticker} Equity</span>
            <span className="text-[10px] text-dim font-bold bg-[#111] px-1">EXCHANGE: NSQ</span>
          </div>
          <div className="flex gap-3 text-[10px] font-mono select-none">
            <span className="text-green">O: 182.52</span>
            <span className="text-red">H: 184.10</span>
            <span className="text-green">L: 181.25</span>
            <span className="text-white">C: 183.12</span>
          </div>
       </div>
       <div ref={chartContainerRef} className="flex-1 w-full h-full" />
    </div>
  );
};

export default TerminalChart;
