# D:\AASHISH\Projects\trade\backend\strategies\rsi_strategy.py
import pandas as pd
from .base import StrategyBase

class RSIMeanReversion(StrategyBase):
    def __init__(self, binance_client, params):
        super().__init__(binance_client, params)
        self.rsi_period = params.get('period', 14)
        self.overbought = params.get('overbought', 70)
        self.oversold = params.get('oversold', 30)
        self.closes = []  # Rolling window of close prices

    def on_market_data(self, symbol, data):
        if data.get('e') != '24hrMiniTicker':
            return None
        
        price = float(data['c'])
        self.closes.append(price)
        if len(self.closes) > self.rsi_period:
            self.closes.pop(0)
        
        if len(self.closes) < self.rsi_period:
            return None
        
        # Calculate RSI
        df = pd.DataFrame(self.closes, columns=['close'])
        delta = df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=self.rsi_period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=self.rsi_period).mean()
        rs = gain / loss
        df['rsi'] = 100 - (100 / (1 + rs))
        
        rsi = df['rsi'].iloc[-1]
        
        # Generate signal
        if rsi < self.oversold and self.position <= 0:
            quantity = self.params.get('quantity', 0.001)
            if self.check_risk(symbol, quantity):
                self.position = 1
                return {'action': 'BUY', 'price': price, 'quantity': quantity}
        elif rsi > self.overbought and self.position >= 0:
            quantity = self.params.get('quantity', 0.001)
            if self.check_risk(symbol, quantity):
                self.position = -1
                return {'action': 'SELL', 'price': price, 'quantity': quantity}
        elif self.position != 0 and (rsi >= self.oversold and rsi <= self.overbought):  # Exit when RSI returns to neutral
            quantity = abs(self.position) * self.params.get('quantity', 0.001)
            action = 'SELL' if self.position > 0 else 'BUY'
            self.position = 0
            return {'action': action, 'price': price, 'quantity': quantity}
        return None