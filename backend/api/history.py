# backend/api/history.py
"""
REST endpoint: historical OHLCV bars.

GET /api/history/{symbol}?interval=1d&limit=500

Response: list of bar dicts (canonical, same schema for crypto + equity).
Tries SQLite cache first; falls back to provider if cache is cold.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from ingestion.normalizer import normalize_bars
from ingestion.timeseries_store import TimeseriesStore
from providers import registry

router = APIRouter(prefix="/api/history", tags=["history"])

# Injected by ws_server.py at startup
_store: TimeseriesStore | None = None


def set_store(store: TimeseriesStore) -> None:
    global _store
    _store = store


@router.get("/{symbol}")
async def get_history(
    symbol:   str,
    interval: str = Query("1d",  description="Bar interval (1m 5m 15m 1h 1d …)"),
    limit:    int = Query(500,   ge=1, le=2000, description="Max bars to return"),
):
    """
    Return historical OHLCV bars for *symbol*.

    Asset class is detected automatically — BTCUSDT → Binance, AAPL → yfinance.
    Results are cached in SQLite after the first fetch.
    """
    sym = symbol.upper()
    try:
        # Try cache first
        if _store:
            cached = await _store.get_bars(sym, interval=interval, limit=limit)
            if len(cached) >= min(limit, 10):   # cache hit threshold
                return cached

        # Cache miss → fetch from provider
        provider = registry.get_provider(sym)
        bars     = await provider.get_history(sym, interval=interval, limit=limit)
        normalised = normalize_bars(bars)

        # Persist for next call
        if _store and normalised:
            await _store.persist_bars(normalised, interval)

        return normalised

    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
