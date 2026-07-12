import React from 'react';

const TradingChart = ({ symbol, priceHistory }) => {
  if (priceHistory.length === 0) {
    return <div className="chart-placeholder">Loading chart data...</div>;
  }

  const prices = priceHistory.map(p => p.price);
  const times = priceHistory.map(p => new Date(p.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}));

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;
  const padding = 20;

  const width = 600;
  const height = 200;

  const scaleX = (index) => (index / (prices.length - 1)) * (width - 2 * padding) + padding;
  const scaleY = (price) => height - (((price - minPrice) / priceRange) * (height - 2 * padding)) + padding;

  const points = prices.map((price, i) => `${scaleX(i)},${scaleY(price)}`).join(' ');

  return (
    <div className="chart-container">
      <h3>{symbol} Price Chart (1m)</h3>
      <svg width={width} height={height} className="price-chart">
        <polyline 
          points={points} 
          fill="none" 
          stroke="#4cc9f0" 
          strokeWidth="2"
        />
        {/* Axes */}
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#666" strokeWidth="1"/>
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#666" strokeWidth="1"/>
        {/* Labels */}
        <text x={10} y={20} fontSize="12" fill="#666">{minPrice.toFixed(2)}</text>
        <text x={10} y={height - 10} fontSize="12" fill="#666">{maxPrice.toFixed(2)}</text>
      </svg>
      <div className="chart-time-axis">
        {times.map((time, i) => 
          i % Math.max(1, Math.floor(times.length / 5)) === 0 && (
            <span key={i} style={{display: 'inline-block', width: `${width / times.length}px`, textAlign: 'center'}}>
              {time}
            </span>
          )
        )}
      </div>
    </div>
  );
};

export default TradingChart;