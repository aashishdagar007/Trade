# backend/ingestion/timeseries_store.py
"""
TimeseriesStore — in-memory ring buffer for live ticks + optional SQLite
persistence via SQLAlchemy for OHLCV history.

Design
------
* Ring buffer (collections.deque with maxlen) per symbol — keeps the last
  N ticks in RAM so the history REST endpoint can serve short windows
  instantly without re-hitting the provider.
* SQLite persistence: each normalised bar is upserted into a `bars` table.
  This means historical data survives server restarts.
* Thread-safe: async locks guard ring buffer writes; SQLAlchemy sessions
  are created per operation (no shared session state).

Usage
-----
store = TimeseriesStore()
store.push_tick(normalised_tick_dict)
recent = store.get_recent_ticks("BTCUSDT", n=60)

await store.persist_bar(normalised_bar_dict)
bars = await store.get_bars("AAPL", interval="1d", limit=200)
"""

from __future__ import annotations

import asyncio
import os
from collections import deque
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    Column, Float, Index, Integer, String, create_engine, text
)
from sqlalchemy.orm import DeclarativeBase, Session

# ---------------------------------------------------------------------------
# SQLAlchemy ORM model
# ---------------------------------------------------------------------------

class Base(DeclarativeBase):
    pass


class BarRecord(Base):
    __tablename__ = "bars"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    symbol      = Column(String(20), nullable=False)
    asset_class = Column(String(10), nullable=False)
    interval    = Column(String(10), nullable=False)
    ts          = Column(Integer,  nullable=False)   # bar open time, Unix ms
    open        = Column(Float,    nullable=False)
    high        = Column(Float,    nullable=False)
    low         = Column(Float,    nullable=False)
    close       = Column(Float,    nullable=False)
    volume      = Column(Float,    nullable=True)

    __table_args__ = (
        Index("ix_bars_symbol_interval_ts", "symbol", "interval", "ts"),
    )


# ---------------------------------------------------------------------------
# Store
# ---------------------------------------------------------------------------

class TimeseriesStore:
    """
    Combined in-memory ring buffer + SQLite persistence.
    """

    RING_BUFFER_SIZE = 1000   # ticks per symbol

    def __init__(self, db_path: Optional[str] = None) -> None:
        # Per-symbol ring buffers: symbol → deque[dict]
        self._ticks: Dict[str, deque] = {}
        self._lock = asyncio.Lock()

        # SQLite
        if db_path is None:
            data_dir = Path(__file__).resolve().parent.parent / "data"
            data_dir.mkdir(exist_ok=True)
            db_path = str(data_dir / "timeseries.db")

        self._engine = create_engine(
            f"sqlite:///{db_path}",
            connect_args={"check_same_thread": False},
        )
        Base.metadata.create_all(self._engine)

    # ------------------------------------------------------------------
    # Tick ring buffer (in-memory)
    # ------------------------------------------------------------------

    async def push_tick(self, tick: dict) -> None:
        """Append a normalised tick dict to the ring buffer."""
        symbol = tick.get("symbol", "UNKNOWN")
        async with self._lock:
            if symbol not in self._ticks:
                self._ticks[symbol] = deque(maxlen=self.RING_BUFFER_SIZE)
            self._ticks[symbol].append(tick)

    def get_recent_ticks(self, symbol: str, n: int = 60) -> list[dict]:
        """Return the last *n* ticks for *symbol* (newest last)."""
        buf = self._ticks.get(symbol.upper(), deque())
        items = list(buf)
        return items[-n:] if len(items) > n else items

    def get_last_tick(self, symbol: str) -> Optional[dict]:
        buf = self._ticks.get(symbol.upper(), deque())
        return buf[-1] if buf else None

    def all_symbols(self) -> list[str]:
        return list(self._ticks.keys())

    # ------------------------------------------------------------------
    # Bar persistence (SQLite)
    # ------------------------------------------------------------------

    async def persist_bar(self, bar: dict, interval: str) -> None:
        """Upsert a normalised bar dict into SQLite."""
        await asyncio.to_thread(self._upsert_bar_sync, bar, interval)

    async def persist_bars(self, bars: list[dict], interval: str) -> None:
        """Batch upsert normalised bar dicts."""
        await asyncio.to_thread(self._upsert_bars_sync, bars, interval)

    async def get_bars(
        self,
        symbol:   str,
        interval: str = "1d",
        limit:    int = 500,
    ) -> list[dict]:
        """Return stored bars from SQLite (newest last)."""
        return await asyncio.to_thread(self._get_bars_sync, symbol.upper(), interval, limit)

    # ------------------------------------------------------------------
    # Sync SQLite helpers
    # ------------------------------------------------------------------

    def _upsert_bar_sync(self, bar: dict, interval: str) -> None:
        with Session(self._engine) as session:
            # Simple upsert: delete existing row for same (symbol, interval, ts)
            session.execute(
                text(
                    "DELETE FROM bars WHERE symbol=:s AND interval=:i AND ts=:t"
                ),
                {"s": bar["symbol"], "i": interval, "t": bar["ts"]},
            )
            record = BarRecord(
                symbol      = bar["symbol"],
                asset_class = bar["asset_class"],
                interval    = interval,
                ts          = bar["ts"],
                open        = bar["open"],
                high        = bar["high"],
                low         = bar["low"],
                close       = bar["close"],
                volume      = bar.get("volume"),
            )
            session.add(record)
            session.commit()

    def _upsert_bars_sync(self, bars: list[dict], interval: str) -> None:
        with Session(self._engine) as session:
            for bar in bars:
                session.execute(
                    text(
                        "DELETE FROM bars WHERE symbol=:s AND interval=:i AND ts=:t"
                    ),
                    {"s": bar["symbol"], "i": interval, "t": bar["ts"]},
                )
                session.add(BarRecord(
                    symbol      = bar["symbol"],
                    asset_class = bar["asset_class"],
                    interval    = interval,
                    ts          = bar["ts"],
                    open        = bar["open"],
                    high        = bar["high"],
                    low         = bar["low"],
                    close       = bar["close"],
                    volume      = bar.get("volume"),
                ))
            session.commit()

    def _get_bars_sync(self, symbol: str, interval: str, limit: int) -> list[dict]:
        with Session(self._engine) as session:
            rows = (
                session.query(BarRecord)
                .filter_by(symbol=symbol, interval=interval)
                .order_by(BarRecord.ts.desc())
                .limit(limit)
                .all()
            )
            rows.reverse()  # oldest first
            return [
                {
                    "symbol":      r.symbol,
                    "asset_class": r.asset_class,
                    "interval":    r.interval,
                    "ts":          r.ts,
                    "open":        r.open,
                    "high":        r.high,
                    "low":         r.low,
                    "close":       r.close,
                    "volume":      r.volume,
                }
                for r in rows
            ]
