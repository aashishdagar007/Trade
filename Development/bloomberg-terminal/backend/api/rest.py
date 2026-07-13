"""
REST endpoints for anything that isn't a live stream: chart backfill,
symbol search/autocomplete for the command bar.
"""

from fastapi import APIRouter, HTTPException
from ..providers.router import resolve_provider

router = APIRouter()


@router.get("/history/{symbol}")
async def get_history(symbol: str, interval: str = "1h", lookback: str = "7d"):
    provider = resolve_provider(symbol)
    try:
        ticks = await provider.get_history(symbol, interval, lookback)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"history fetch failed: {e}")
    return {
        "symbol": symbol.upper(),
        "asset_class": provider.asset_class,
        "candles": [
            {"price": t.price, "volume": t.volume, "ts": t.ts_ms, **(t.raw or {})}
            for t in ticks
        ],
    }


@router.get("/search")
async def search_symbol(q: str):
    # naive: try both providers, merge results -- fine for v1, replace with a
    # real symbology index once you're past the prototype stage
    from ..providers.binance_provider import BinanceProvider
    from ..providers.equities_provider import EquitiesProvider

    crypto_matches, equity_matches = [], []
    try:
        crypto_matches = await BinanceProvider().search_symbol(q)
    except Exception:
        pass
    try:
        equity_matches = await EquitiesProvider().search_symbol(q)
    except Exception:
        pass

    return {
        "crypto": crypto_matches,
        "equity": equity_matches,
    }
