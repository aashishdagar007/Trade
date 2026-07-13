"""
Single unified WebSocket endpoint the Electron frontend connects to.

Client protocol (simple JSON messages):
  Client -> Server:  {"action": "subscribe", "symbol": "BTCUSDT"}
                      {"action": "unsubscribe", "symbol": "BTCUSDT"}
  Server -> Client:   {"symbol": ..., "asset_class": ..., "price": ..., "volume": ..., "ts": ...}

One background asyncio task per unique symbol currently subscribed to by
ANY client -- if three panels watch AAPL, we only open one upstream feed.
"""

import asyncio
import json
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from .providers.router import resolve_provider
from .ingestion.normalizer import normalize

logger = logging.getLogger("ws_server")

app = FastAPI(title="Bloomberg-replica market data server")

# symbol -> set of connected websockets subscribed to it
_subscribers: dict[str, set[WebSocket]] = {}
# symbol -> background asyncio.Task feeding that symbol
_feed_tasks: dict[str, asyncio.Task] = {}


async def _feed_symbol(symbol: str):
    """Long-running task: pulls ticks from the right provider, fans out to all subscribers."""
    provider = resolve_provider(symbol)
    try:
        async for raw_tick in provider.subscribe(symbol):
            tick = normalize(raw_tick, provider.asset_class)
            payload = json.dumps(tick.to_json())

            dead_sockets = []
            for ws in _subscribers.get(symbol, set()):
                try:
                    await ws.send_text(payload)
                except Exception:
                    dead_sockets.append(ws)
            for ws in dead_sockets:
                _subscribers[symbol].discard(ws)
    except asyncio.CancelledError:
        pass
    except Exception:
        logger.exception(f"feed task for {symbol} crashed")


def _ensure_feed_running(symbol: str):
    if symbol not in _feed_tasks or _feed_tasks[symbol].done():
        _feed_tasks[symbol] = asyncio.create_task(_feed_symbol(symbol))


@app.websocket("/ws")
async def market_data_ws(websocket: WebSocket):
    await websocket.accept()
    my_symbols: set[str] = set()

    try:
        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)
            action = msg.get("action")
            symbol = (msg.get("symbol") or "").upper()

            if action == "subscribe" and symbol:
                _subscribers.setdefault(symbol, set()).add(websocket)
                my_symbols.add(symbol)
                _ensure_feed_running(symbol)

            elif action == "unsubscribe" and symbol:
                _subscribers.get(symbol, set()).discard(websocket)
                my_symbols.discard(symbol)

    except WebSocketDisconnect:
        pass
    finally:
        # clean up this client's subscriptions; stop feed tasks with no listeners left
        for symbol in my_symbols:
            _subscribers.get(symbol, set()).discard(websocket)
            if not _subscribers.get(symbol):
                task = _feed_tasks.pop(symbol, None)
                if task:
                    task.cancel()
