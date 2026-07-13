"""
Abstract base class every market data provider must implement.

The whole point of this layer: the WS server and frontend never know
whether a tick came from Binance's live WS feed or a polled yfinance
snapshot. They both look identical by the time they leave normalizer.py.
"""

from abc import ABC, abstractmethod
from typing import AsyncIterator, Optional
from dataclasses import dataclass


@dataclass
class RawTick:
    """Provider-native tick, before normalization."""
    symbol: str
    price: float
    volume: Optional[float]
    ts_ms: int
    bid: Optional[float] = None
    ask: Optional[float] = None
    raw: Optional[dict] = None  # keep original payload for debugging


class MarketDataProvider(ABC):
    """One implementation per asset class / data source."""

    asset_class: str = "unknown"  # "crypto" | "equity" | "fx" etc.

    @abstractmethod
    async def subscribe(self, symbol: str) -> AsyncIterator[RawTick]:
        """
        Yield RawTick objects for `symbol` forever (or until cancelled).
        For a true streaming source (Binance WS) this is a real subscription.
        For a polled source (yfinance) this should internally loop + sleep,
        but the caller sees the exact same async-generator interface either way.
        """
        raise NotImplementedError
        yield  # pragma: no cover  (makes this a generator for type checkers)

    @abstractmethod
    async def get_history(self, symbol: str, interval: str, lookback: str) -> list[RawTick]:
        """
        Return historical OHLCV-ish ticks for chart backfill.
        interval: '1m' | '5m' | '1h' | '1d' etc. (provider maps to its own format)
        lookback: '1d' | '7d' | '1mo' etc.
        """
        raise NotImplementedError

    @abstractmethod
    async def search_symbol(self, query: str) -> list[dict]:
        """Symbol lookup for the command bar's autocomplete, e.g. 'AAPL' -> matches."""
        raise NotImplementedError
