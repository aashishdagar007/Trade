"""
Equities provider backed by yfinance (free, delayed ~15min on some exchanges,
near-real-time on others -- good enough for v1). Polled internally but exposed
through the exact same async-generator interface as the Binance WS provider,
so the rest of the system can't tell the difference.

Swap-out path for later: implement PolygonProvider / FinnhubProvider with the
same base class, same subscribe() signature, and the frontend needs zero changes.
"""

import asyncio
import time
from typing import AsyncIterator

import yfinance as yf

from .base import MarketDataProvider, RawTick

POLL_INTERVAL_SECONDS = 2  # tune based on rate limits; yfinance has no official SLA


class EquitiesProvider(MarketDataProvider):
    asset_class = "equity"

    async def subscribe(self, symbol: str) -> AsyncIterator[RawTick]:
        ticker = yf.Ticker(symbol.upper())
        last_price = None

        while True:
            try:
                # fast_info avoids the heavier full .info scrape
                info = ticker.fast_info
                price = float(info["last_price"])
                volume = float(info.get("last_volume", 0) or 0)

                if price != last_price:
                    last_price = price
                    yield RawTick(
                        symbol=symbol.upper(),
                        price=price,
                        volume=volume,
                        ts_ms=int(time.time() * 1000),
                        bid=float(info.get("bid", 0) or 0) or None,
                        ask=float(info.get("ask", 0) or 0) or None,
                    )
            except Exception:
                # market closed / bad symbol / transient fetch error -- don't kill the stream
                pass

            await asyncio.sleep(POLL_INTERVAL_SECONDS)

    async def get_history(self, symbol: str, interval: str, lookback: str) -> list[RawTick]:
        ticker = yf.Ticker(symbol.upper())
        # yfinance interval strings: 1m, 5m, 15m, 1h, 1d ... period: 1d, 5d, 1mo, 1y
        hist = ticker.history(period=lookback, interval=interval)

        ticks = []
        for ts, row in hist.iterrows():
            ticks.append(RawTick(
                symbol=symbol.upper(),
                price=float(row["Close"]),
                volume=float(row["Volume"]),
                ts_ms=int(ts.timestamp() * 1000),
                raw={
                    "open": row["Open"], "high": row["High"],
                    "low": row["Low"], "close": row["Close"],
                },
            ))
        return ticks

    async def search_symbol(self, query: str) -> list[dict]:
        # yfinance has no first-class search API; a thin wrapper around
        # their undocumented search endpoint is the common workaround --
        # fine for v1, swap for a real symbology provider later.
        results = yf.Search(query, max_results=15).quotes
        return [
            {"symbol": r.get("symbol"), "name": r.get("shortname"), "exchange": r.get("exchange")}
            for r in results
        ]
