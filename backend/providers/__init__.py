# backend/providers/__init__.py
"""
ProviderRegistry — maps any symbol string to the right BaseProvider.

Rules (evaluated in order):
  1. Symbols ending in USDT, BTC, ETH, BNB, BUSD → BinanceProvider (crypto)
  2. Everything else → EquitiesProvider

Adding a new asset class (e.g. futures, forex):
  - Implement BaseProvider in a new file
  - Add a matching rule to ProviderRegistry.get_provider()
  - Nothing in ws_server.py or the API layer changes.
"""

from __future__ import annotations

import os
from functools import lru_cache
from typing import Optional

from .base import BaseProvider
from .binance_provider import BinanceProvider
from .equities_provider import EquitiesProvider

# Crypto quote currencies that identify a Binance pair
_CRYPTO_SUFFIXES = ("USDT", "BTC", "ETH", "BNB", "BUSD", "USDC", "TUSD", "DAI")


class ProviderRegistry:
    """
    Singleton that lazily initialises providers on first use.
    Providers are shared — one BinanceProvider instance handles all crypto
    symbols, one EquitiesProvider handles all equity symbols.
    """

    def __init__(self) -> None:
        self._binance:  Optional[BinanceProvider]  = None
        self._equities: Optional[EquitiesProvider] = None

    def get_provider(self, symbol: str) -> BaseProvider:
        """Return the correct initialised provider for *symbol*."""
        if self._is_crypto(symbol):
            return self._get_binance()
        return self._get_equities()

    def _is_crypto(self, symbol: str) -> bool:
        s = symbol.upper()
        return any(s.endswith(suffix) for suffix in _CRYPTO_SUFFIXES)

    def _get_binance(self) -> BinanceProvider:
        if self._binance is None:
            self._binance = BinanceProvider(
                api_key    = os.getenv("BINANCE_API_KEY", ""),
                api_secret = os.getenv("BINANCE_API_SECRET", ""),
            )
        return self._binance

    def _get_equities(self) -> EquitiesProvider:
        if self._equities is None:
            self._equities = EquitiesProvider()
        return self._equities

    async def initialize_all(self) -> None:
        """Call once at application startup to warm up connections."""
        binance = self._get_binance()
        await binance.initialize()
        # EquitiesProvider has no async init step (yfinance is sync)

    async def close_all(self) -> None:
        """Call at shutdown to cleanly close WebSocket connections."""
        if self._binance:
            await self._binance.close()


# Module-level singleton — import this everywhere
registry = ProviderRegistry()
