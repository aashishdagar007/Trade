# backend/api/search.py
"""
REST endpoint: symbol search across both asset classes.

GET /api/search?q=aapl           → equity results
GET /api/search?q=btc            → crypto results
GET /api/search?q=apple          → company name search

Uses yfinance for equity name resolution and a static crypto symbol list
for Binance pairs.  Results include asset_class so the frontend can badge them.
"""

from __future__ import annotations

import asyncio
from typing import Any

import yfinance as yf
from fastapi import APIRouter, Query, HTTPException

router = APIRouter(prefix="/api/search", tags=["search"])

# Top-100 Binance USDT pairs (static seed — good enough for MVP)
_CRYPTO_SEED = [
    "BTCUSDT","ETHUSDT","BNBUSDT","SOLUSDT","XRPUSDT","DOGEUSDT","ADAUSDT",
    "TRXUSDT","AVAXUSDT","TONUSDT","SHIBUSDT","DOTUSDT","LINKUSDT","MATICUSDT",
    "LTCUSDT","BCHUSDT","NEARUSDT","ICPUSDT","UNIUSDT","APTUSDT","FILUSDT",
    "XLMUSDT","VETUSDT","SANDUSDT","MANAUSDT","AAVEUSDT","MKRUSDT","SNXUSDT",
    "COMPUSDT","CRVUSDT","SUSHIUSDT","YFIUSDT","1INCHUSDT","ENJUSDT","CHZUSDT",
]


@router.get("")
async def search(
    q:     str = Query(..., min_length=1, description="Search query (ticker or company name)"),
    limit: int = Query(10,  ge=1, le=50,  description="Max results"),
):
    """
    Search symbols across both crypto and equities.
    Returns a list of { symbol, name, asset_class, exchange } objects.
    """
    q_upper = q.strip().upper()

    results: list[dict[str, Any]] = []

    # --- Crypto matches (fast, from static seed) ---
    crypto_hits = [
        s for s in _CRYPTO_SEED
        if q_upper in s
    ][:limit]
    for sym in crypto_hits:
        results.append({
            "symbol":      sym,
            "name":        sym.replace("USDT", "/USDT"),
            "asset_class": "crypto",
            "exchange":    "Binance",
        })

    # --- Equity matches via yfinance ---
    if len(results) < limit:
        try:
            equity_results = await asyncio.to_thread(_equity_search, q, limit - len(results))
            results.extend(equity_results)
        except Exception as exc:
            # Non-fatal — return what we have
            print(f"[search] equity search error: {exc}")

    return results[:limit]


def _equity_search(query: str, limit: int) -> list[dict[str, Any]]:
    """Synchronous yfinance ticker lookup (run in thread)."""
    try:
        # yfinance.Search is available in newer versions
        search_obj = yf.Search(query, max_results=limit)
        quotes = getattr(search_obj, "quotes", []) or []
        results = []
        for q in quotes:
            sym = q.get("symbol", "")
            if not sym:
                continue
            results.append({
                "symbol":      sym,
                "name":        q.get("longname") or q.get("shortname") or sym,
                "asset_class": "equity",
                "exchange":    q.get("exchange", ""),
            })
        return results
    except Exception:
        # Fallback: treat query as a direct ticker
        return [{
            "symbol":      query.upper(),
            "name":        query.upper(),
            "asset_class": "equity",
            "exchange":    "",
        }]
