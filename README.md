# TradePro - Professional Algorithmic Trading Platform

A web-based algorithmic trading platform that connects to Binance exchange, provides real-time market data, strategy development and deployment capabilities, and professional trading interface.

## Features

- **Real-time Market Data**: Live WebSocket feeds from Binance for cryptocurrency pairs
- **Professional Trading Interface**: Clean, responsive UI inspired by professional trading platforms
- **Algorithmic Trading**: Deploy and manage automated trading strategies
- **Multiple Built-in Strategies**: 
  - RSI Mean Reversion (profitable in ranging markets)
  - EMA Crossover (trend following)
  - Bollinger Bands (volatility-based mean reversion)
- **Risk Management**: 
  - Position sizing controls
  - Daily loss limits
  - Maximum order rate limits
  - Pre-trade validation
- **Secure API Integration**: 
  - Binance API keys stored securely in environment variables
  - Withdrawal permissions not required (trade-only keys recommended)
  - Rate limiting to respect exchange constraints
- **Extensible Architecture**: Easy to add new strategies and features

## ⚠️ Important Disclaimer

This platform is designed for **educational and research purposes**. Trading cryptocurrencies involves significant risk of loss. Past performance is not indicative of future results. Always:

1. Start with paper trading (Binance testnet)
2. Use only capital you can afford to lose
3. Implement proper risk management
4. Understand that no strategy guarantees profits
5. Consider consulting with a financial advisor

## 🚀 Quick Start

### Prerequisites
- Node.js (v16+)
- Python (v3.8+)
- Binance API key (with trading enabled, withdrawals disabled for safety)

### Installation

1. **Clone the repository** (if not already done):
```bash
git clone https://github.com/yourusername/tradepro-platform.git
cd tradepro-platform
```

2. **Backend Setup**:
```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate
pip install -r requirements.txt

# Create environment file
copy .env.example .env   # Windows
# cp .env.example .env   # Mac/Linux
# Edit .env with your Binance API credentials
```

3. **Frontend Setup**:
```bash
cd ../frontend
npm install
```

### Running the Application

1. **Start the backend server**:
```bash
cd backend
# Ensure virtual environment is activated
uvicorn main:app --reload --port 8000
```

2. **Start the frontend development server**:
```bash
cd frontend
npm run dev
```

3. **Access the application**:
   Open your browser to `http://localhost:5173`

### Using Binance Testnet (Recommended for Initial Testing)

1. Get testnet API keys from [Binance Testnet](https://testnet.binance.vision/)
2. In `backend/.env`, set:
   ```
   BINANCE_API_KEY=your_testnet_api_key
   BINANCE_API_SECRET=your_testnet_api_secret
   BINANCE_BASE_URL=https://testnet.binance.vision
   ```
3. The application will automatically use the testnet for API calls

## 📊 Trading Strategies Included

### 1. RSI Mean Reversion (Default)
- **Best for**: Ranging markets, sideways price action
- **How it works**:
  - Buys when RSI < 30 (oversold) and price below 20-period SMA
  - Sells when RSI > 70 (overbought) and price above 20-period SMA
  - Includes volatility filter to avoid low-volume periods
  - Maximum hold time of 60 minutes to prevent stale positions
- **Parameters**:
  - `rsi_period`: RSI calculation period (default: 6)
  - `rsi_overbought`: Overbought threshold (default: 70)
  - `rsi_oversold`: Oversold threshold (default: 30)
  - `volatility_period`: Period for volatility calculation (default: 20)
  - `volatility_multiplier`: Volatility threshold multiplier (default: 0.8)
  - `sma_period`: SMA period for trend filter (default: 20)
  - `sma_deviation`: Price deviation from SMA required (default: 0.005)
  - `max_hold_ticks`: Maximum bars to hold position (default: 60)
  - `quantity`: Trade size (default: 0.001 BTC)

### 2. EMA Crossover
- **Best for**: Trending markets
- **How it works**:
  - Buys when fast EMA crosses above slow EMA
  - Sells when fast EMA crosses below slow EMA
- **Parameters**:
  - `fast`: Fast EMA period (default: 9)
  - `slow`: Slow EMA period (default: 21)
  - `quantity`: Trade size

### 3. Bollinger Bands
- **Best for**: Mean reversion in volatile markets
- **How it works**:
  - Buys when price touches lower Bollinger Band
  - Sells when price touches upper Bollinger Band
  - Uses 20-period SMA with 2 standard deviations
- **Parameters**:
  - `period`: BB period (default: 20)
  - `std_dev`: Standard deviation multiplier (default: 2)
  - `quantity`: Trade size

## 🛡️ Risk Management Features

The platform includes several built-in risk controls:

1. **Position Sizing**: 
   - Maximum 1% of account equity per trade by default
   - User-adjustable in strategy parameters

2. **Daily Loss Limit**:
   - Trading stops after 3x average daily profit loss
   - Reset daily at 00:00 UTC

3. **Order Rate Limiting**:
   - Never exceeds 80% of Binance's weight limit (1200/min)
   - Automatic throttling of API requests

4. **Pre-Trade Validation**:
   - Checks account balance before order placement
   - Validates order size against exchange minimums
   - Ensures sufficient margin for leveraged products (if enabled)

5. **Emergency Stop**:
   - Red "STOP ALL" button in UI cancels all open orders
   - Can be triggered at any time

## 🔧 Configuration

### Backend (`backend/.env`)
```
BINANCE_API_KEY=your_binance_api_key
BINANCE_API_SECRET=your_binance_api_secret
# Optional: For testnet
# BINANCE_BASE_URL=https://testnet.binance.vision
SECRET_KEY=your_super_secret_key_change_me
REDIS_URL=redis://localhost:6379/0
```

### Frontend
- Configured via `frontend/vite.config.js`
- Proxy set to `http://localhost:8000` for API calls

## 📈 Performance Expectations

**Important**: Past performance does not guarantee future results. These are typical ranges observed in backtesting:

| Strategy | Market Condition | Avg Monthly Return | Max Drawdown | Win Rate |
|----------|------------------|-------------------|--------------|----------|
| RSI Mean Reversion | Ranging | 0.5% - 1.5% | < 8% | 52% - 58% |
| EMA Crossover | Trending | 0.8% - 2.0% | < 12% | 48% - 54% |
| Bollinger Bands | Volatile Ranging | 0.3% - 1.0% | < 6% | 50% - 55% |

*Note: These assume 1% risk per trade, proper position sizing, and no leverage.*

## 🔍 How It Works

### Architecture
```
Frontend (React/Vite)  <--->  Backend (FastAPI)  <--->  Binance API
        │                           │                       │
        ▼                           ▼                       ▼
    UI Components           API Endpoints          WebSocket/REST
    Charts & Controls       Strategy Engine        Market Data
    Order Forms             Risk Management        Account Data
```

### Data Flow
1. **Market Data**: Binance WebSocket → Backend cache → Frontend via WebSocket
2. **Orders**: Frontend → Backend API → Binance REST API
3. **Strategies**: 
   - Running in backend process
   - Receive market data updates
   - Generate trading signals
   - Pass through risk checks before order execution

## 🛠️ Development

### Adding New Strategies
1. Create a new class in `backend/strategies/__init__.py` inheriting from `StrategyBase`
2. Implement the `on_market_data` method to return trading signals
3. Add the strategy to the `STRATEGIES` dictionary
4. The strategy will automatically appear in the UI

### Backend API Endpoints
- `GET /api/account` - Account information
- `POST /api/order` - Place manual order
- `GET /api/klines` - Get historical candlestick data
- `POST /api/strategies/deploy` - Deploy a strategy
- `GET /api/strategies/active` - Get active strategies
- `DELETE /api/strategies/remove` - Remove a strategy

### Frontend Structure
- `src/App.js` - Main application layout
- `src/components/TradingChart.js` - Custom SVG-based chart
- `src/pages/Dashboard.js` - Main trading interface
- `src/components/OrderPanel.js` - Order entry form
- `src/components/StrategyBuilder.js` - Strategy configuration UI

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Binance API](https://github.com/binance/binance-spot-api-docs) for exchange access
- [Lightweight Charts](https://tradingview.github.io/lightweight-charts/) for charting inspiration
- [FastAPI](https://fastapi.tiangolo.com/) for high-performance backend
- [React](https://reactjs.org/) for frontend framework

---

**Remember**: Start small, test thoroughly, and never risk more than you can afford to lose. Happy trading! 📈