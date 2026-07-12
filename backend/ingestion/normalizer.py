# backend/ingestion/normalizer.py
"""
Normalizer — validates and enriches raw provider data before it leaves
the backend.  Thin layer: providers already output canonical Tick/Bar
objects, so normalizer's job is:

  1. Validate required fields are present and sane.
  2. Round floats to a display-friendly precision.
  3. Attach a server-side sequence number for ordering.
  4. Enrich with derived fields (spread, spread_bps) when bid/ask are present.

Both the WebSocket feed (ws_server.py) and REST history endpoint
(api/history.py) pass data through here before serialisation.
"""

from __future__ import annotations

import itertools
from typing import Optional

from providers.base import Bar, Tick

# Monotonically increasing sequence counter (per process lifetime)
_seq_counter = itertools.count(1)


def normalize_tick(tick: Tick) -> dict:
    """
    Convert a Tick dataclass → JSON-serialisable dict ready for the wire.
    Adds `seq` (server sequence number) and derived spread fields.
    """
    d = tick.to_dict()

    # Server sequence number
    d["seq"] = next(_seq_counter)

    # Round floats — 8 decimal places for crypto, 4 for equities
    decimals = 8 if tick.asset_class == "crypto" else 4
    for key in ("price", "bid", "ask", "open", "high", "low"):
        if d.get(key) is not None:
            d[key] = round(d[key], decimals)

    if d.get("change_pct") is not None:
        d["change_pct"] = round(d["change_pct"], 4)

    # Derived: spread (absolute) and spread in basis-points
    if d.get("bid") is not None and d.get("ask") is not None:
        spread = d["ask"] - d["bid"]
        d["spread"]     = round(spread, decimals)
        d["spread_bps"] = round(spread / d["price"] * 10_000, 2) if d["price"] else None
    else:
        d["spread"]     = None
        d["spread_bps"] = None

    return d


def normalize_bar(bar: Bar) -> dict:
    """
    Convert a Bar dataclass → JSON-serialisable dict.
    """
    d = bar.to_dict()
    decimals = 8 if bar.asset_class == "crypto" else 4
    for key in ("open", "high", "low", "close"):
        if d.get(key) is not None:
            d[key] = round(d[key], decimals)
    if d.get("volume") is not None:
        d["volume"] = round(d["volume"], 2)
    return d


def normalize_bars(bars: list[Bar]) -> list[dict]:
    return [normalize_bar(b) for b in bars]
