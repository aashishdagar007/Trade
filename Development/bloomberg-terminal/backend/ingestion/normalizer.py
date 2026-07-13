"""
Converts a RawTick (provider-native) into the canonical tick schema that
gets stored in TimescaleDB and pushed over the WebSocket to the frontend.

This is the one place both asset classes become indistinguishable to
everything downstream.
"""

from dataclasses import dataclass, asdict
from ..providers.base import RawTick


@dataclass
class CanonicalTick:
    symbol: str
    asset_class: str   # "crypto" | "equity"
    price: float
    volume: float
    ts: int             # epoch ms
    bid: float | None = None
    ask: float | None = None

    def to_json(self) -> dict:
        return asdict(self)


def normalize(raw: RawTick, asset_class: str) -> CanonicalTick:
    return CanonicalTick(
        symbol=raw.symbol,
        asset_class=asset_class,
        price=raw.price,
        volume=raw.volume or 0.0,
        ts=raw.ts_ms,
        bid=raw.bid,
        ask=raw.ask,
    )
