# D:\AASHISH\Projects\trade\backend\main.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from binance_client import BinanceClient
from strategies.manager import StrategyManager
import json
import asyncio
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

app = FastAPI(title="TradePro Algo Trading Platform")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
binance_client = BinanceClient(
    api_key=os.getenv("BINANCE_API_KEY"),
    api_secret=os.getenv("BINANCE_API_SECRET")
)
strategy_manager = StrategyManager(binance_client)

# Serve static files (for production build of frontend)
# app.mount("/", StaticFiles(directory="../frontend/dist", html=True), name="static")

# WebSocket manager for market data broadcasts
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

# WebSocket endpoint for market data
@app.websocket("/ws/market-data/{symbol}")
async def websocket_endpoint(websocket: WebSocket, symbol: str):
    await manager.connect(websocket)
    try:
        # Subscribe to Binance combined stream (miniTicker)
        stream_name = f"{symbol.lower()}@miniTicker"
        await binance_client.start_combined_stream([stream_name], lambda data: asyncio.create_task(
            manager.broadcast(json.dumps({"type": "market_data", "data": data}))
        ))
        while True:
            await websocket.receive_text()  # Keep connection alive
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)

# REST API endpoints
@app.get("/api/account")
async def get_account():
    try:
        account = await binance_client.get_account()
        return account
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/klines")
async def get_klines(symbol: str, interval: str = "1m", limit: int = 50):
    try:
        klines = await binance_client.get_klines(symbol=symbol, interval=interval, limit=limit)
        # Format for charting: [timestamp, open, high, low, close, volume]
        formatted = []
        for k in klines:
            formatted.append({
                "time": k[0],  # Open time
                "open": float(k[1]),
                "high": float(k[2]),
                "low": float(k[3]),
                "close": float(k[4]),
                "volume": float(k[5])
            })
        return formatted
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/strategies/deploy")
async def deploy_strategy(strategy_id: str, params: dict):
    try:
        result = await strategy_manager.deploy(strategy_id, params)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/strategies/stop/{strategy_id}")
async def stop_strategy(strategy_id: str):
    try:
        result = strategy_manager.stop(strategy_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/strategies/active")
async def get_active_strategies():
    return strategy_manager.get_active_strategies()

@app.get("/api/strategies/status/{strategy_id}")
async def get_strategy_status(strategy_id: str):
    return strategy_manager.get_strategy_status(strategy_id)

@app.on_event("startup")
async def startup_event():
    # Initialize Binance client
    await binance_client.initialize()
    # Optionally deploy default strategy if API keys are present
    # For safety, we don't auto-deploy; user must trigger via frontend
    print("TradePro backend started successfully")

@app.on_event("shutdown")
async def shutdown_event():
    await binance_client.close_connection()
    # Cancel all running strategies
    for strategy_id in list(strategy_manager.active_strategies.keys()):
        strategy_manager.stop(strategy_id)
    print("TradePro backend shutdown complete")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)