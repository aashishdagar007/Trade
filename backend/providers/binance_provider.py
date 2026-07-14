# backend/providers/binance_provider.py
"""
Crypto provider — wraps python-binance with real WebSocket streams.
Implements BaseProvider so the rest of the system is asset-class-agnostic.

Refactored from the original backend/binance_client.py:
  - BinanceClient  →  BinanceProvider(BaseProvider)
  - subscribe()    wraps start_combined_stream + emits canonical Tick
  - get_history()  wraps get_klines → list[Bar]
  - get_quote()    wraps get_symbol_ticker → Tick
"""

from __future__ import annotations

import asyncio
import json
import os
import time
from typing import Any, Callable, Dict, List, Literal, Optional

from binance import AsyncClient, BinanceSocketManager
from binance.enums import ORDER_TYPE_LIMIT, TIME_IN_FORCE_GTC

from .base import Bar, BaseProvider, Tick, TickCallback


class BinanceProvider(BaseProvider):
    """
    Real-time crypto data from Binance.

    Usage
    -----
    provider = BinanceProvider(api_key, api_secret)
    await provider.initialize()
    await provider.subscribe("BTCUSDT", my_callback)
    """

    def __init__(self, api_key: str, api_secret: str) -> None:
        self.api_key    = api_key
        self.api_secret = api_secret
        self.client: Optional[AsyncClient] = None
        self.bsm:    Optional[BinanceSocketManager] = None

        # Internal caches (kept from original BinanceClient)
        self._ticker_cache:     Dict[str, Dict] = {}
        self._order_book_cache: Dict[str, Dict] = {}
        self._symbol_info:      Dict[str, Any]  = {}

        # Rate limiting
        self._last_request_ms: float = 0.0
        self._REQUEST_WEIGHT_LIMIT   = 1100  # stay under 1200/min

    # ------------------------------------------------------------------
    # BaseProvider interface
    # ------------------------------------------------------------------

    @property
    def asset_class(self) -> Literal["crypto", "equity"]:
        return "crypto"

    async def subscribe(self, symbol: str, callback: TickCallback) -> None:
        """
        Open a combined miniTicker + depth stream for *symbol*.
        Converts raw Binance events → canonical Tick and calls *callback*.
        Runs until the calling task is cancelled.
        """
        ticker_stream = f"{symbol.lower()}@miniTicker"
        depth_stream  = f"{symbol.lower()}@depth5@100ms"

        async with self.bsm.combined_stream([ticker_stream, depth_stream]) as stream:
            while True:
                try:
                    resp = await stream.recv()
                    data = resp["data"]
                    event = data.get("e", "")

                    if event == "24hrMiniTicker":
                        sym = data["s"]
                        self._ticker_cache[sym] = {
                            "price":  float(data["c"]),
                            "open":   float(data["o"]),
                            "high":   float(data["h"]),
                            "low":    float(data["l"]),
                            "volume": float(data["v"]),
                            "ts":     int(data["E"]),
                        }
                        tick = self._build_tick(sym)
                        await callback(tick)

                    elif event == "depthUpdate":
                        sym = data["s"]
                        self._order_book_cache[sym] = {
                            "bids": [[float(b[0]), float(b[1])] for b in data["b"][:5]],
                            "asks": [[float(a[0]), float(a[1])] for a in data["a"][:5]],
                        }
                        # Depth changes far more often than the 24hr ticker
                        # updates -- push it through immediately so the
                        # order book panel is actually live, not just
                        # refreshed whenever a ticker event happens to fire.
                        if sym in self._ticker_cache:
                            tick = self._build_tick(sym)
                            await callback(tick)

                except asyncio.CancelledError:
                    raise
                except Exception as exc:
                    print(f"[BinanceProvider] stream error: {exc}")
                    await asyncio.sleep(1)

    async def get_history(
        self,
        symbol:   str,
        interval: str = "1m",
        limit:    int = 500,
    ) -> list[Bar]:
        """Return historical OHLCV bars from Binance klines endpoint."""
        self._rate_limit()
        raw = await self.client.get_klines(symbol=symbol, interval=interval, limit=limit)
        bars: list[Bar] = []
        for k in raw:
            bars.append(Bar(
                symbol      = symbol,
                asset_class = "crypto",
                ts          = int(k[0]),
                open        = float(k[1]),
                high        = float(k[2]),
                low         = float(k[3]),
                close       = float(k[4]),
                volume      = float(k[5]),
            ))
        return bars

    async def get_quote(self, symbol: str) -> Tick:
        """Single price snapshot — no streaming."""
        self._rate_limit()
        raw = await self.client.get_symbol_ticker(symbol=symbol)
        price = float(raw["price"])
        return Tick(
            symbol      = symbol,
            asset_class = "crypto",
            price       = price,
            ts          = Tick.now_ms(),
        )

    # ------------------------------------------------------------------
    # Initialisation / teardown (kept from original BinanceClient)
    # ------------------------------------------------------------------

    async def initialize(self) -> None:
        self.client = await AsyncClient.create(self.api_key, self.api_secret)
        self.bsm    = BinanceSocketManager(self.client)
        await self._prefetch_exchange_info()

    async def close(self) -> None:
        if self.client:
            await self.client.close_connection()

    # ------------------------------------------------------------------
    # Order management (unchanged from original BinanceClient)
    # ------------------------------------------------------------------

    async def create_order(
        self,
        symbol:     str,
        side:       str,
        quantity:   float,
        order_type: str   = ORDER_TYPE_LIMIT,
        price:      float = None,
    ) -> dict:
        self._rate_limit()
        params: dict = {
            "symbol":   symbol,
            "side":     side,
            "type":     order_type,
            "quantity": self._format_quantity(symbol, quantity),
        }
        if order_type == ORDER_TYPE_LIMIT and price:
            params["price"]       = self._format_price(symbol, price)
            params["timeInForce"] = TIME_IN_FORCE_GTC
        return await self.client.create_order(**params)

    async def get_account(self) -> dict:
        self._rate_limit()
        return await self.client.get_account()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _build_tick(self, symbol: str) -> Tick:
        t  = self._ticker_cache.get(symbol, {})
        ob = self._order_book_cache.get(symbol, {})

        bids = ob.get("bids") or []
        asks = ob.get("asks") or []
        best_bid = bids[0][0] if bids else None
        best_ask = asks[0][0] if asks else None

        open_price = t.get("open")
        price      = t.get("price", 0.0)
        change_pct = ((price - open_price) / open_price * 100) if open_price else None

        return Tick(
            symbol      = symbol,
            asset_class = "crypto",
            price       = price,
            ts          = t.get("ts", Tick.now_ms()),
            volume      = t.get("volume"),
            bid         = best_bid,
            ask         = best_ask,
            # NOTE: open/high/low here are the *24-hour* rolling stats from
            # Binance's miniTicker stream, not the current chart bar's OHLC.
            # Don't use these to build candlesticks client-side -- see
            # ChartPanel.tsx's own local bar-bucketing logic instead.
            open        = open_price,
            high        = t.get("high"),
            low         = t.get("low"),
            change_pct  = change_pct,
            bids        = bids or None,
            asks        = asks or None,
        )

    def _rate_limit(self) -> None:
        min_interval_ms = 60_000 / self._REQUEST_WEIGHT_LIMIT  # ~55 ms
        now_ms = time.time() * 1000
        gap    = now_ms - self._last_request_ms
        if gap < min_interval_ms:
            time.sleep((min_interval_ms - gap) / 1000)
        self._last_request_ms = time.time() * 1000

    async def _prefetch_exchange_info(self) -> None:
        info = await self.client.get_exchange_info()
        self._symbol_info = {s["symbol"]: s for s in info["symbols"]}

    def _format_quantity(self, symbol: str, quantity: float) -> str:
        info      = self._symbol_info.get(symbol, {})
        lot_filter = next(
            (f for f in info.get("filters", []) if f["filterType"] == "LOT_SIZE"), None
        )
        if not lot_filter:
            return f"{quantity:.8f}"
        step = lot_filter["stepSize"]
        prec = len(step.split(".")[1].rstrip("0")) if "." in step else 0
        return f"{quantity:.{prec}f}"

    def _format_price(self, symbol: str, price: float) -> str:
        info         = self._symbol_info.get(symbol, {})
        price_filter = next(
            (f for f in info.get("filters", []) if f["filterType"] == "PRICE_FILTER"), None
        )
        if not price_filter:
            return f"{price:.8f}"
        tick = price_filter["tickSize"]
        prec = len(tick.split(".")[1].rstrip("0")) if "." in tick else 0
        return f"{price:.{prec}f}"
