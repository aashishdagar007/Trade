# D:\AASHISH\Projects\trade\backend\strategies\__init__.py
import math
from typing import Dict, Any
from binance_client import BinanceClient

class StrategyBase:
    def __init__(self, client: BinanceClient, params: Dict[str, Any]):
        self.client = client
        self.params = params
        self.position = 0  # 0: flat, 1: long, -1: short
        self.last_signal = 0
        self.entry_time = 0
        self.entry_price = 0.0

    def on_market_data(self, symbol: str, data: dict) -> dict:
        """Returns {'action': 'BUY/SELL/CLOSE', 'price': float, 'quantity': float} or None"""
        raise NotImplementedError

    def check_risk(self, symbol: str, quantity: float) -> bool:
        """Pre-trade risk checks"""
        # This is a simplified version - in production you'd check actual account balance
        # For now, we'll assume it's always okay (risk management handled elsewhere)
        return True

class BBRSIMeanReversion(StrategyBase):
    """Bollinger Bands + RSI Mean Reversion Strategy"""
    def __init__(self, client: BinanceClient, params: Dict[str, Any]):
        super().__init__(client, params)
        self.bb_length = params.get('bb_length', 20)
        self.bb_std = params.get('bb_std', 2.0)
        self.rsi_length = params.get('rsi_length', 14)
        self.rsi_overbought = params.get('rsi_overbought', 70)
        self.rsi_oversold = params.get('rsi_oversold', 30)
        self.prices = []  # Rolling window of close prices
        self.closes = []  # For RSI calculation (same as prices but we'll use it for clarity)
        self.rsi_values = []  # Store recent RSI values for smoothing (optional)
        
    def _calculate_mean(self, data):
        return sum(data) / len(data) if data else 0
    
    def _calculate_std(self, data, mean_val):
        if len(data) < 2:
            return 0
        variance = sum((x - mean_val) ** 2 for x in data) / len(data)
        return math.sqrt(variance)
    
    def _calculate_rsi(self, prices, length):
        if len(prices) < length + 1:
            return 50.0  # Neutral
        
        gains = []
        losses = []
        for i in range(1, len(prices)):
            change = prices[i] - prices[i-1]
            if change >= 0:
                gains.append(change)
                losses.append(0)
            else:
                gains.append(0)
                losses.append(-change)
        
        avg_gain = sum(gains) / length
        avg_loss = sum(losses) / length
        
        if avg_loss == 0:
            return 100.0
        rs = avg_gain / avg_loss
        return 100 - (100 / (1 + rs))

    def on_market_data(self, symbol: str, data: dict) -> dict:
        if data.get('e') != '24hrMiniTicker':
            return None
            
        close_price = float(data['c'])
        self.prices.append(close_price)
        self.closes.append(close_price)
        
        # Keep only necessary history
        if len(self.prices) > self.bb_length:
            self.prices.pop(0)
        if len(self.closes) > self.rsi_length:
            self.closes.pop(0)
        
        # Need enough data for calculations
        if len(self.prices) < self.bb_length:
            return None
            
        # Calculate Bollinger Bands
        mean_price = self._calculate_mean(self.prices)
        std_price = self._calculate_std(self.prices, mean_price)
        upper_band = mean_price + (self.bb_std * std_price)
        lower_band = mean_price - (self.bb_std * std_price)
        
        # Calculate RSI
        rsi = self._calculate_rsi(self.closes, self.rsi_length)
        
        # Trading logic
        signal = None
        quantity = self.params.get('quantity', 0.001)
        
        # ENTRY CONDITIONS
        if self.position == 0:  # Flat - look for entry
            # Long signal: price at/below lower band AND RSI oversold
            if close_price <= lower_band and rsi < self.rsi_oversold:
                signal = 'BUY'
            # Short signal: price at/above upper band AND RSI overbought
            elif close_price >= upper_band and rsi > self.rsi_overbought:
                signal = 'SELL'
        
        # EXIT CONDITIONS
        elif self.position != 0:  # In position
            # Exit long: price crosses above middle band (mean) OR RSI > 50 (momentum shift)
            if self.position == 1:  # Long
                if close_price >= mean_price or rsi > 50:
                    signal = 'CLOSE'
            # Exit short: price crosses below middle band OR RSI < 50
            elif self.position == -1:  # Short
                if close_price <= mean_price or rsi < 50:
                    signal = 'CLOSE'
        
        if signal and self.check_risk(symbol, quantity):
            return {
                'action': signal,
                'price': close_price,
                'quantity': quantity
            }
        return None

# Default strategy set to BBRSIMeanReversion
STRATEGIES = {
    "BBRSIMeanReversion": BBRSIMeanReversion
}