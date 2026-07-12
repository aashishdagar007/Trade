# backend/providers/base.py
"""
Abstract provider interface.
Every asset class (crypto, equity, futures, …) must implement BaseProvider.
The rest of the system never imports a concrete provider directly — it always
goes through ProviderRegistry in __init__.py.
"""

from __future__ import annotations

import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field, asdict
from typing import Any, Callable, Coroutine, Literal, Optional


# ---------------------------------------------------------------------------
# Canonical tick schema
# ---------------------------------------------------------------------------

@dataclass
class Tick:
    """
    Canonical market data tick.  Same shape regardless of asset class.
    Fields that are unavailable on a given provider/tier are left as None.

    JSON representation (what the WebSocket and REST endpoints emit):
    {
        "symbol":     "AAPL",
        "asset_class": "equity",
        "price":      213.44,
        "volume":     1200,
        "ts":         1752300000000,   # Unix ms
        "bid":        213.42,          # None for equities on free tier
        "ask":        213.46,          # None for equities on free tier
        "open":       212.10,          # 24h open (or session open)
        "high":       214.00,
        "low":        211.80,
        "change_pct": 0.63             # % change vs open
    }
    """
    symbol:      str
    asset_class: Literal["crypto", "equity"]
    price:       float
    ts:          int                # Unix milliseconds
    volume:      Optional[float] = None
    bid:         Optional[float] = None
    ask:         Optional[float] = None
    open:        Optional[float] = None
    high:        Optional[float] = None
    low:         Optional[float] = None
    change_pct:  Optional[float] = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @staticmethod
    def now_ms() -> int:
        return int(time.time() * 1000)


# ---------------------------------------------------------------------------
# Canonical OHLCV bar (history endpoint)
# ---------------------------------------------------------------------------

@dataclass
class Bar:
    symbol:      str
    asset_class: Literal["crypto", "equity"]
    ts:          int    # bar open time, Unix ms
    open:        float
    high:        float
    low:         float
    close:       float
    volume:      float

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


# ---------------------------------------------------------------------------
# Provider callback type
# ---------------------------------------------------------------------------

TickCallback = Callable[[Tick], Coroutine[Any, Any, None]]


# ---------------------------------------------------------------------------
# Abstract interface
# ---------------------------------------------------------------------------

class BaseProvider(ABC):
    """
    Every provider must implement exactly these three methods plus the
    asset_class property.  The signature is intentionally simple so adding
    a new data source (Polygon.io, Alpaca, dYdX …) only requires a new file.
    """

    @property
    @abstractmethod
    def asset_class(self) -> Literal["crypto", "equity"]:
        """Return the asset class this provider handles."""
        ...

    @abstractmethod
    async def subscribe(self, symbol: str, callback: TickCallback) -> None:
        """
        Start streaming live ticks for *symbol*.
        Must call *callback(tick)* each time a new tick arrives.
        Should run indefinitely until the task is cancelled.
        """
        ...

    @abstractmethod
    async def get_history(
        self,
        symbol:   str,
        interval: str = "1m",
        limit:    int = 500,
    ) -> list[Bar]:
        """Return historical OHLCV bars newest-last."""
        ...

    @abstractmethod
    async def get_quote(self, symbol: str) -> Tick:
        """Return a single current-price snapshot (no streaming)."""
        ...
