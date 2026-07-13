"""
Crypto provider backed by Binance's public WebSocket streams.
No API key needed for market data (only for placing real orders,
which is a later phase and belongs in its own execution module).
"""

import asyncio
import json
import time
from typing import AsyncIterator

import websockets
import httpx

from .base import MarketDataProvider, RawTick

BINANCE_WS_BASE = "wss://stream.binance.com:9443/ws"
BINANCE_REST_BASE = "https://api.binance.com/api/v3"


class BinanceProvider(MarketDataProvider):
    asset_class = "crypto"

    async def subscribe(self, symbol: str) -> AsyncIterator[RawTick]:
        """
        symbol e.g. 'BTCUSDT'. Uses the trade stream for true tick-by-tick data.
        Reconnects automatically on drop -- Binance WS connections are
        recycled by the exchange periodically, this is expected, not an error.
        """
        stream = f"{symbol.lower()}@trade"
        url = f"{BINANCE_WS_BASE}/{stream}"

        while True:
            try:
                async with websockets.connect(url, ping_interval=20) as ws:
                    async for message in ws:
                        data = json.loads(message)
                        yield RawTick(
                            symbol=symbol.upper(),
                            price=float(data["p"]),
                            volume=float(data["q"]),
                            ts_ms=int(data["T"]),
                            raw=data,
                        )
            except (websockets.ConnectionClosed, asyncio.TimeoutError):
                await asyncio.sleep(2)  # brief backoff, then reconnect
                continue

    async def get_history(self, symbol: str, interval: str, lookback: str) -> list[RawTick]:
        """
        Pulls klines (candles) via REST for chart backfill.
        interval maps directly to Binance's own format (1m, 5m, 1h, 1d...).
        """
        limit = _lookback_to_limit(lookback, interval)
        params = {
            "symbol": symbol.upper(),
            "interval": interval,
            "limit": limit,
        }
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{BINANCE_REST_BASE}/klines", params=params)
            resp.raise_for_status()
            klines = resp.json()

        ticks = []
        for k in klines:
            # kline format: [open_time, open, high, low, close, volume, close_time, ...]
            ticks.append(RawTick(
                symbol=symbol.upper(),
                price=float(k[4]),  # close
                volume=float(k[5]),
                ts_ms=int(k[0]),
                raw={"open": k[1], "high": k[2], "low": k[3], "close": k[4]},
            ))
        return ticks

    async def search_symbol(self, query: str) -> list[dict]:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{BINANCE_REST_BASE}/exchangeInfo")
            resp.raise_for_status()
            symbols = resp.json()["symbols"]

        query_upper = query.upper()
        matches = [
            {"symbol": s["symbol"], "base": s["baseAsset"], "quote": s["quoteAsset"]}
            for s in symbols
            if query_upper in s["symbol"]
        ]
        return matches[:20]


def _lookback_to_limit(lookback: str, interval: str) -> int:
    """Rough conversion of a human lookback window into a candle count, capped at Binance's 1000 max."""
    unit_seconds = {"m": 60, "h": 3600, "d": 86400}
    interval_seconds = int(interval[:-1]) * unit_seconds[interval[-1]]

    amount = int(lookback[:-1])
    lb_unit = lookback[-1]
    lookback_seconds = amount * unit_seconds.get(lb_unit, 86400)

    return min(1000, max(1, lookback_seconds // interval_seconds))
