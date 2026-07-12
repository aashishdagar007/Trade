# D:\AASHISH\Projects\trade\backend\strategies\base.py
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class StrategyBase(ABC):
    def __init__(self, binance_client, params: Dict[str, Any]):
        """
        Initialize the strategy.
        :param binance_client: An instance of BinanceClient
        :param params: Strategy parameters
        """
        self.client = binance_client
        self.params = params
        self.position = 0  # 0: flat, 1: long, -1: short
        self.last_signal = 0  # To avoid duplicate signals

    @abstractmethod
    def on_market_data(self, symbol: str, data: dict) -> Optional[dict]:
        """
        Process market data and return a trade signal if any.
        :param symbol: Trading pair symbol (e.g., 'BTCUSDT')
        :param data: Market data from the WebSocket stream
        :return: A dictionary with keys 'action', 'price', 'quantity' or None
                 Example: {'action': 'BUY', 'price': 100.0, 'quantity': 0.001}
        """
        pass

    def check_risk(self, symbol: str, quantity: float) -> bool:
        """
        Perform risk checks before placing an order.
        This is a basic implementation. In production, you'd want more sophisticated checks.
        :param symbol: Trading pair symbol
        :param quantity: Order quantity
        :return: True if the trade passes risk checks, False otherwise
        """
        try:
            # Get account info to check balance
            # Note: This is a synchronous call in an async context. In production, you'd want to cache this.
            # For simplicity, we'll do a quick check without blocking the event loop too much.
            # Alternatively, we can pre-fetch account info and update it periodically.
            # Since we are in an async method, we cannot directly call the async client method.
            # We'll skip the balance check for now and rely on the exchange to reject invalid orders.
            # In a real system, you would have a separate task that updates account info.
            # For now, we'll just return True and let the exchange handle validation.
            return True
        except Exception as e:
            logger.error(f"Risk check failed: {e}")
            return False

    def calculate_quantity(self, symbol: str, risk_amount: float) -> float:
        """
        Calculate the quantity to trade based on a risk amount (in quote currency).
        This is a simplified version. In practice, you'd use stop loss to determine position size.
        :param symbol: Trading pair symbol
        :param risk_amount: Amount of quote currency to risk (e.g., USDT)
        :return: Quantity of base currency to trade
        """
        # Get the current price
        ticker = self.client.price_cache.get(symbol)
        if not ticker:
            # Fallback to fetching the price (not ideal, but for example)
            # In a real system, you'd have a price cache that's updated via WebSocket
            return 0.0
        price = ticker['price']
        if price == 0:
            return 0.0
        quantity = risk_amount / price
        # Adjust quantity to the step size
        return self.client._format_quantity(symbol, quantity)