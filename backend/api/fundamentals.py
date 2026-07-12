# backend/api/fundamentals.py
"""
REST endpoint: company / asset fundamentals.

GET /api/fundamentals/{symbol}

For equities: P/E, EPS, market cap, sector, 52-week range, etc. (yfinance .info)
For crypto: circulating supply, market cap from yfinance Yahoo Finance crypto pages.

Returns a flat dict — the frontend decides which fields to surface.
"""

from __future__ import annotations

import asyncio
from typing import Any

import yfinance as yf
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/fundamentals", tags=["fundamentals"])

# Fields to extract (ordered for display priority)
_EQUITY_FIELDS = [
    "longName", "shortName", "sector", "industry", "country", "exchange",
    "marketCap", "enterpriseValue", "trailingPE", "forwardPE", "priceToBook",
    "trailingEps", "forwardEps", "dividendYield", "payoutRatio",
    "revenueGrowth", "earningsGrowth", "grossMargins", "operatingMargins",
    "profitMargins", "returnOnEquity", "returnOnAssets",
    "currentRatio", "debtToEquity", "totalCash", "totalDebt",
    "52WeekChange", "fiftyTwoWeekHigh", "fiftyTwoWeekLow",
    "fiftyDayAverage", "twoHundredDayAverage",
    "beta", "sharesOutstanding", "floatShares",
    "averageVolume", "averageVolume10days",
    "recommendationMean", "numberOfAnalystOpinions",
    "currency", "financialCurrency",
]

_CRYPTO_FIELDS = [
    "longName", "shortName", "marketCap", "circulatingSupply", "maxSupply",
    "volume24Hr", "volumeAllCurrencies", "startDate",
    "52WeekChange", "fiftyTwoWeekHigh", "fiftyTwoWeekLow",
    "fiftyDayAverage", "twoHundredDayAverage",
    "currency",
]


def _is_crypto(symbol: str) -> bool:
    return symbol.endswith(("USDT", "BTC", "ETH", "BNB", "-USD", "-BTC"))


def _fetch_fundamentals_sync(yf_sym: str, is_crypto: bool) -> dict[str, Any]:
    tkr    = yf.Ticker(yf_sym)
    info   = tkr.info or {}
    fields = _CRYPTO_FIELDS if is_crypto else _EQUITY_FIELDS
    result = {k: info.get(k) for k in fields}
    result["asset_class"] = "crypto" if is_crypto else "equity"
    result["symbol"]      = yf_sym
    return result


@router.get("/{symbol}")
async def get_fundamentals(symbol: str):
    """
    Return fundamental data for *symbol*.
    """
    sym     = symbol.upper()
    crypto  = _is_crypto(sym)

    # Remap Binance pairs to Yahoo Finance format
    yf_sym = sym
    if sym.endswith("USDT"):
        yf_sym = sym.replace("USDT", "-USD")

    try:
        data = await asyncio.to_thread(_fetch_fundamentals_sync, yf_sym, crypto)
        return data
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
