# D:\AASHISH\Projects\trade\backend\strategies\ema_crossover.py
import pandas as pd
from .base import StrategyBase

class EMACrossover(StrategyBase):
    def __init__(self, binance_client, params):
        super().__init__(binance_client, params)
        self.fast_period = params.get('fast', 9)
        self.slow_period = params.get('slow', 21)
        self.prices = []  # Rolling window of close prices

    def on_market_data(self, symbol, data):
        if data.get('e') != '24hrMiniTicker':
            return None
        
        price = float(data['c'])
        self.prices.append(price)
        # Keep only the last `slow_period` prices
        if len(self.prices) > self.slow_period:
            self.prices.pop(0)
        
        if len(self.prices) < self.slow_period:
            return None
        
        # Calculate EMAs
        df = pd.DataFrame(self.prices, columns=['close'])
        df['ema_fast'] = df['close'].ewm(span=self.fast_period).mean()
        df['ema_slow'] = df['close'].ewm(span=self.slow_period).mean()
        
        # Generate signal
        if df['ema_fast'].iloc[-2] <= df['ema_slow'].iloc[-2] and df['ema_fast'].iloc[-1] > df['ema_slow'].iloc[-1]:
            self.last_signal = 1  # Golden cross (bullish)
        elif df['ema_fast'].iloc[-2] >= df['ema_slow'].iloc[-2] and df['ema_fast'].iloc[-1] < df['ema_slow'].iloc[-1]:
            self.last_signal = -1  # Death cross (bearish)
        else:
            self.last_signal = 0
        
        # Execute on signal change
        if self.last_signal == 1 and self.position <= 0:
            quantity = self.params.get('quantity', 0.001)  # Default quantity
            if self.check_risk(symbol, quantity):
                self.position = 1
                return {'action': 'BUY', 'price': price, 'quantity': quantity}
        elif self.last_signal == -1 and self.position >= 0:
            quantity = self.params.get('quantity', 0.001)
            if self.check_risk(symbol, quantity):
                self.position = -1
                return {'action': 'SELL', 'price': price, 'quantity': quantity}
        elif self.position != 0 and self.last_signal == 0:  # Exit on signal loss
            quantity = abs(self.position) * self.params.get('quantity', 0.001)
            action = 'SELL' if self.position > 0 else 'BUY'
            self.position = 0
            return {'action': action, 'price': price, 'quantity': quantity}
        return None