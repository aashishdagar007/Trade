"""
Decides which provider handles a given symbol.

v1 convention (simple, extend later with a proper symbology table):
  - Crypto pairs end in a known quote asset: BTCUSDT, ETHUSDT, etc.
  - Everything else is treated as a US equity ticker: AAPL, MSFT, etc.

Command bar syntax we're aiming to support later:
  'BTC USDT<GO>'  -> crypto
  'AAPL US<GO>'   -> equity (the 'US' suffix mirrors real BBG syntax)
"""

from .base import MarketDataProvider
from .binance_provider import BinanceProvider
from .equities_provider import EquitiesProvider

_CRYPTO_QUOTE_SUFFIXES = ("USDT", "BUSD", "USDC", "BTC", "ETH")

_binance = BinanceProvider()
_equities = EquitiesProvider()


def resolve_provider(symbol: str) -> MarketDataProvider:
    symbol_upper = symbol.upper()
    if any(symbol_upper.endswith(suffix) for suffix in _CRYPTO_QUOTE_SUFFIXES) and len(symbol_upper) > 3:
        return _binance
    return _equities
