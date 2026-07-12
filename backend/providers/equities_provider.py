# backend/providers/equities_provider.py
"""
Equities provider — polls yfinance every 1-2 s during NYSE market hours,
wraps the result in canonical Tick objects, and pushes them through the
same callback interface as BinanceProvider.

This makes the frontend completely unaware of the difference between a
real WebSocket stream (crypto) and a polled snapshot (equities). When you
upgrade to Polygon.io / Finnhub / Alpaca, you only change this file.

Market hours logic
------------------
NYSE regular session: 09:30 – 16:00 ET (America/New_York).
Outside those hours we emit one tick per subscribe() call (the last known
price from yfinance) and then sleep until the next session opens.

Swap point
----------
Replace _fetch_yfinance() with a Polygon.io WebSocket or Finnhub REST call
and nothing else in the system needs to change.
"""

from __future__ import annotations

import asyncio
import time
from datetime import datetime, time as dtime
from typing import Dict, List, Literal, Optional
from zoneinfo import ZoneInfo  # Python 3.9+

import yfinance as yf

from .base import Bar, BaseProvider, Tick, TickCallback

# NYSE timezone
_ET = ZoneInfo("America/New_York")

# Regular session window
_MARKET_OPEN  = dtime(9, 30)
_MARKET_CLOSE = dtime(16, 0)

# Polling interval in seconds (during market hours)
_POLL_INTERVAL = 1.5


def _is_market_open() -> bool:
    """Return True if NYSE regular session is currently active."""
    now = datetime.now(_ET)
    # Weekdays only
    if now.weekday() >= 5:
        return False
    return _MARKET_OPEN <= now.time() < _MARKET_CLOSE


def _seconds_to_open() -> float:
    """How many seconds until the next NYSE open (approximate)."""
    now    = datetime.now(_ET)
    target = now.replace(hour=9, minute=30, second=0, microsecond=0)
    if now.time() >= _MARKET_OPEN:
        # Already past open today or weekend → next weekday
        import datetime as dt_module
        days_ahead = 1
        while True:
            candidate = now + dt_module.timedelta(days=days_ahead)
            if candidate.weekday() < 5:
                target = candidate.replace(hour=9, minute=30, second=0, microsecond=0)
                break
            days_ahead += 1
    diff = (target - now).total_seconds()
    return max(diff, 0.0)


class EquitiesProvider(BaseProvider):
    """
    Equity market data via yfinance polling.

    Usage
    -----
    provider = EquitiesProvider()
    await provider.subscribe("AAPL", my_callback)   # runs until cancelled
    tick = await provider.get_quote("MSFT")
    bars = await provider.get_history("TSLA", interval="5m", limit=100)
    """

    @property
    def asset_class(self) -> Literal["crypto", "equity"]:
        return "equity"

    # ------------------------------------------------------------------
    # BaseProvider interface
    # ------------------------------------------------------------------

    async def subscribe(self, symbol: str, callback: TickCallback) -> None:
        """
        Poll yfinance every _POLL_INTERVAL seconds during NYSE hours.
        Outside hours: emit one stale tick and sleep until next open.
        """
        while True:
            try:
                if _is_market_open():
                    tick = await asyncio.to_thread(self._fetch_yfinance, symbol)
                    if tick is not None:
                        await callback(tick)
                    await asyncio.sleep(_POLL_INTERVAL)
                else:
                    # Emit stale price once so the panel is not blank
                    tick = await asyncio.to_thread(self._fetch_yfinance, symbol)
                    if tick is not None:
                        await callback(tick)
                    sleep_s = _seconds_to_open()
                    print(
                        f"[EquitiesProvider] Market closed. "
                        f"{symbol} sleeping {sleep_s/3600:.1f}h until open."
                    )
                    await asyncio.sleep(min(sleep_s, 3600))  # wake at most every hour
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                print(f"[EquitiesProvider] subscribe error for {symbol}: {exc}")
                await asyncio.sleep(5)

    async def get_history(
        self,
        symbol:   str,
        interval: str = "1d",
        limit:    int = 500,
    ) -> list[Bar]:
        """
        Return historical OHLCV bars via yfinance.

        yfinance interval strings:  1m 2m 5m 15m 30m 60m 90m 1h 1d 5d 1wk 1mo
        *limit* is approximated by choosing an appropriate *period*.
        """
        # Map interval → period string that covers ~limit bars
        period = _interval_to_period(interval, limit)
        bars   = await asyncio.to_thread(self._fetch_history_sync, symbol, interval, period)
        return bars

    async def get_quote(self, symbol: str) -> Tick:
        tick = await asyncio.to_thread(self._fetch_yfinance, symbol)
        if tick is None:
            raise RuntimeError(f"No quote data available for {symbol}")
        return tick

    # ------------------------------------------------------------------
    # Sync helpers (run in thread via asyncio.to_thread)
    # ------------------------------------------------------------------

    def _fetch_yfinance(self, symbol: str) -> Optional[Tick]:
        """
        Fetch the latest price from yfinance.
        Uses fast_info for minimal latency on repeated calls.
        """
        try:
            tkr  = yf.Ticker(symbol)
            info = tkr.fast_info

            price  = getattr(info, "last_price",  None)
            open_  = getattr(info, "open",         None)
            high   = getattr(info, "day_high",     None)
            low    = getattr(info, "day_low",      None)
            volume = getattr(info, "last_volume",  None)

            if price is None:
                return None

            change_pct: Optional[float] = None
            if open_ and open_ != 0:
                change_pct = (price - open_) / open_ * 100

            return Tick(
                symbol      = symbol.upper(),
                asset_class = "equity",
                price       = float(price),
                ts          = Tick.now_ms(),
                volume      = float(volume) if volume is not None else None,
                bid         = None,  # not available on free tier
                ask         = None,
                open        = float(open_)  if open_  is not None else None,
                high        = float(high)   if high   is not None else None,
                low         = float(low)    if low    is not None else None,
                change_pct  = change_pct,
            )
        except Exception as exc:
            print(f"[EquitiesProvider] _fetch_yfinance({symbol}): {exc}")
            return None

    def _fetch_history_sync(
        self, symbol: str, interval: str, period: str
    ) -> list[Bar]:
        try:
            tkr = yf.Ticker(symbol)
            df  = tkr.history(period=period, interval=interval)
            bars: list[Bar] = []
            for ts, row in df.iterrows():
                bars.append(Bar(
                    symbol      = symbol.upper(),
                    asset_class = "equity",
                    ts          = int(ts.timestamp() * 1000),
                    open        = float(row["Open"]),
                    high        = float(row["High"]),
                    low         = float(row["Low"]),
                    close       = float(row["Close"]),
                    volume      = float(row["Volume"]),
                ))
            return bars[-limit:] if len(bars) > limit else bars
        except Exception as exc:
            print(f"[EquitiesProvider] _fetch_history_sync({symbol}): {exc}")
            return []


# ------------------------------------------------------------------
# Utility
# ------------------------------------------------------------------

def _interval_to_period(interval: str, limit: int) -> str:
    """
    Approximate the yfinance *period* parameter needed to retrieve ~limit bars
    for a given interval string.
    """
    mapping: dict[str, float] = {
        "1m": 1 / (60 * 24),    # 1 bar = 1/1440 of a day
        "2m": 2 / (60 * 24),
        "5m": 5 / (60 * 24),
        "15m": 15 / (60 * 24),
        "30m": 30 / (60 * 24),
        "60m": 1 / 24,
        "90m": 90 / (60 * 24),
        "1h":  1 / 24,
        "1d":  1.0,
        "5d":  5.0,
        "1wk": 7.0,
        "1mo": 30.0,
    }
    days_per_bar = mapping.get(interval, 1.0)
    total_days   = days_per_bar * limit * 1.3  # 30% buffer

    if total_days <= 5:
        return "5d"
    if total_days <= 30:
        return "1mo"
    if total_days <= 90:
        return "3mo"
    if total_days <= 180:
        return "6mo"
    if total_days <= 365:
        return "1y"
    if total_days <= 730:
        return "2y"
    return "5y"
