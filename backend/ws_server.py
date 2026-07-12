# backend/ws_server.py
"""
Unified WebSocket + REST server.

WebSocket: /ws/feed
  Client sends JSON subscription messages:
    { "action": "subscribe",   "symbol": "BTCUSDT" }
    { "action": "unsubscribe", "symbol": "AAPL" }

  Server pushes canonical tick dicts whenever a new tick arrives:
    { "type": "tick", "data": <canonical Tick dict> }

REST API (mounted from api/):
  GET /api/history/{symbol}?interval=1d&limit=500
  GET /api/search?q=aapl
  GET /api/news/{symbol}
  GET /api/fundamentals/{symbol}

  (Strategy endpoints from the original main.py are kept as-is below)

Design notes
------------
* One asyncio Task per active (connection, symbol) subscription — cancelled
  automatically on disconnect or unsubscribe.
* Provider.subscribe() is a generator that runs forever; each Task wraps
  one provider stream and fans the ticks to all connections watching that symbol.
* A SubscriptionManager handles N connections × M symbols efficiently:
  multiple connections watching the same symbol share one provider task.
"""

from __future__ import annotations

import asyncio
import json
import os
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, Set

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Load .env from backend/ directory
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

# Provider registry (initialised at startup)
from providers import registry
from providers.base import Tick

# Ingestion layer
from ingestion.normalizer import normalize_tick
from ingestion.timeseries_store import TimeseriesStore

# REST routers
from api.history      import router as history_router,  set_store
from api.search       import router as search_router
from api.news         import router as news_router
from api.fundamentals import router as fundamentals_router

# Strategy manager (unchanged from original)
from strategies.manager import StrategyManager

# ---------------------------------------------------------------------------
# App + middleware
# ---------------------------------------------------------------------------

app = FastAPI(title="TradePro Terminal — Unified Feed")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Shared singletons
# ---------------------------------------------------------------------------

store: TimeseriesStore = TimeseriesStore()
strategy_manager: StrategyManager = StrategyManager(None)  # provider injected at startup


# ---------------------------------------------------------------------------
# Subscription manager
# ---------------------------------------------------------------------------

class SubscriptionManager:
    """
    Tracks which WebSocket connections are subscribed to which symbols,
    and runs exactly one provider task per unique symbol (shared across
    all connections watching it).

    Topology:
        symbol → set of WebSocket connections
        symbol → asyncio.Task (running provider.subscribe())
    """

    def __init__(self) -> None:
        self._connections: Dict[str, Set[WebSocket]] = defaultdict(set)   # symbol → connections
        self._tasks:       Dict[str, asyncio.Task]   = {}                  # symbol → provider task
        self._sub_counts:  Dict[WebSocket, Set[str]] = defaultdict(set)    # ws → subscribed symbols

    async def subscribe(self, ws: WebSocket, symbol: str) -> None:
        sym = symbol.upper()
        self._connections[sym].add(ws)
        self._sub_counts[ws].add(sym)

        # Start provider task if not already running for this symbol
        if sym not in self._tasks or self._tasks[sym].done():
            task = asyncio.create_task(
                self._stream_symbol(sym),
                name=f"stream:{sym}",
            )
            self._tasks[sym] = task

    async def unsubscribe(self, ws: WebSocket, symbol: str) -> None:
        sym = symbol.upper()
        self._connections[sym].discard(ws)
        self._sub_counts[ws].discard(sym)
        # If nobody is watching this symbol anymore, cancel the provider task
        if not self._connections[sym]:
            task = self._tasks.pop(sym, None)
            if task and not task.done():
                task.cancel()

    async def disconnect(self, ws: WebSocket) -> None:
        """Clean up all subscriptions for a disconnecting client."""
        for sym in list(self._sub_counts.get(ws, set())):
            await self.unsubscribe(ws, sym)
        self._sub_counts.pop(ws, None)

    async def _stream_symbol(self, symbol: str) -> None:
        """
        Long-running task: calls provider.subscribe() which runs forever,
        fans each tick to all connected watchers.
        """
        provider = registry.get_provider(symbol)

        async def on_tick(tick: Tick) -> None:
            normalised = normalize_tick(tick)
            await store.push_tick(normalised)

            payload = json.dumps({"type": "tick", "data": normalised})
            dead: list[WebSocket] = []
            for ws in list(self._connections.get(symbol, set())):
                try:
                    await ws.send_text(payload)
                except Exception:
                    dead.append(ws)

            # Remove dead connections
            for ws in dead:
                await self.disconnect(ws)

        try:
            await provider.subscribe(symbol, on_tick)
        except asyncio.CancelledError:
            pass
        except Exception as exc:
            print(f"[SubscriptionManager] stream error for {symbol}: {exc}")


sub_manager = SubscriptionManager()


# ---------------------------------------------------------------------------
# WebSocket endpoint
# ---------------------------------------------------------------------------

@app.websocket("/ws/feed")
async def websocket_feed(websocket: WebSocket) -> None:
    """
    Single unified WebSocket endpoint.

    Client protocol:
        → { "action": "subscribe",   "symbol": "BTCUSDT" }
        → { "action": "unsubscribe", "symbol": "AAPL" }
        ← { "type": "tick",          "data": <canonical Tick> }
        ← { "type": "error",         "message": "..." }
    """
    await websocket.accept()
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg    = json.loads(raw)
                action = msg.get("action", "")
                symbol = msg.get("symbol", "")

                if not symbol:
                    await websocket.send_text(json.dumps({
                        "type": "error", "message": "symbol is required"
                    }))
                    continue

                if action == "subscribe":
                    await sub_manager.subscribe(websocket, symbol)
                    await websocket.send_text(json.dumps({
                        "type": "subscribed", "symbol": symbol.upper()
                    }))

                elif action == "unsubscribe":
                    await sub_manager.unsubscribe(websocket, symbol)
                    await websocket.send_text(json.dumps({
                        "type": "unsubscribed", "symbol": symbol.upper()
                    }))

                else:
                    await websocket.send_text(json.dumps({
                        "type": "error", "message": f"unknown action: {action}"
                    }))

            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({
                    "type": "error", "message": "invalid JSON"
                }))

    except WebSocketDisconnect:
        pass
    finally:
        await sub_manager.disconnect(websocket)


# ---------------------------------------------------------------------------
# REST — strategy endpoints (kept from original main.py)
# ---------------------------------------------------------------------------

@app.post("/api/strategies/deploy")
async def deploy_strategy(strategy_id: str, params: dict):
    try:
        return await strategy_manager.deploy(strategy_id, params)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/api/strategies/stop/{strategy_id}")
async def stop_strategy(strategy_id: str):
    try:
        return strategy_manager.stop(strategy_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.get("/api/strategies/active")
async def get_active_strategies():
    return strategy_manager.get_active_strategies()


@app.get("/api/strategies/status/{strategy_id}")
async def get_strategy_status(strategy_id: str):
    return strategy_manager.get_strategy_status(strategy_id)


@app.get("/api/account")
async def get_account():
    try:
        provider = registry.get_provider("BTCUSDT")
        return await provider.get_account()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# Mount REST routers
# ---------------------------------------------------------------------------

app.include_router(history_router)
app.include_router(search_router)
app.include_router(news_router)
app.include_router(fundamentals_router)


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def startup() -> None:
    await registry.initialize_all()
    set_store(store)  # give history router access to the store
    # Inject the Binance provider into strategy manager
    strategy_manager.client = registry.get_provider("BTCUSDT")
    print("✓ TradePro Terminal backend started")


@app.on_event("shutdown")
async def shutdown() -> None:
    await registry.close_all()
    for sid in list(strategy_manager.get_active_strategies()):
        strategy_manager.stop(sid)
    print("✓ TradePro Terminal backend stopped")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
