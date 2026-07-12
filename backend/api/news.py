# backend/api/news.py
"""
REST endpoint: news headlines for a symbol.

GET /api/news/{symbol}?limit=20

Uses yfinance .news for both equity and crypto tickers.
Returns a list of normalised headline objects with a simple
sentiment score (positive / negative / neutral) derived from
keyword matching — no external API key required.
"""

from __future__ import annotations

import asyncio
import re
from typing import Any

import yfinance as yf
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/api/news", tags=["news"])

# Simple keyword-based sentiment lexicon
_POSITIVE_WORDS = {
    "surge", "soar", "rally", "gain", "rise", "jump", "bull", "beat",
    "record", "profit", "growth", "strong", "outperform", "upgrade",
    "buy", "positive", "boost", "revenue", "earnings", "exceed",
}
_NEGATIVE_WORDS = {
    "fall", "drop", "plunge", "crash", "decline", "loss", "miss", "bear",
    "downgrade", "sell", "negative", "warn", "cut", "layoff", "debt",
    "default", "fraud", "lawsuit", "investigation", "concern", "risk",
}


def _score_sentiment(text: str) -> str:
    words    = set(re.findall(r"\w+", text.lower()))
    pos_hits = len(words & _POSITIVE_WORDS)
    neg_hits = len(words & _NEGATIVE_WORDS)
    if pos_hits > neg_hits:
        return "positive"
    if neg_hits > pos_hits:
        return "negative"
    return "neutral"


def _fetch_news_sync(symbol: str, limit: int) -> list[dict[str, Any]]:
    """Synchronous yfinance news fetch (run in asyncio thread)."""
    try:
        tkr   = yf.Ticker(symbol)
        items = tkr.news or []
        out   = []
        for item in items[:limit]:
            content  = item.get("content", {})
            title    = content.get("title",   item.get("title", ""))
            summary  = content.get("summary", "")
            pub_date = content.get("pubDate", "")
            source   = (content.get("provider") or {}).get("displayName", "")
            url      = (content.get("canonicalUrl") or {}).get("url", "")

            sentiment = _score_sentiment(title + " " + summary)

            out.append({
                "id":        item.get("id", ""),
                "title":     title,
                "summary":   summary,
                "source":    source,
                "url":       url,
                "published": pub_date,
                "sentiment": sentiment,
                "symbol":    symbol.upper(),
            })
        return out
    except Exception as exc:
        raise RuntimeError(f"yfinance news fetch failed: {exc}") from exc


@router.get("/{symbol}")
async def get_news(
    symbol: str,
    limit:  int = Query(20, ge=1, le=100),
):
    """
    Return recent news headlines for *symbol* with sentiment scoring.
    Works for both equity tickers (AAPL) and crypto (BTCUSDT → BTC-USD).
    """
    sym = symbol.upper()

    # yfinance uses BTC-USD style for crypto on Yahoo Finance
    yf_sym = sym
    if sym.endswith("USDT"):
        yf_sym = sym.replace("USDT", "-USD")
    elif sym.endswith("BTC") and len(sym) > 3:
        yf_sym = sym.replace("BTC", "-BTC")

    try:
        news = await asyncio.to_thread(_fetch_news_sync, yf_sym, limit)
        return news
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
