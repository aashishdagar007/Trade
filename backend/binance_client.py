# D:\AASHISH\Projects\trade\backend\binance_client.py
import os
import asyncio
import json
from binance import AsyncClient, BinanceSocketManager
from binance.enums import *
from typing import Dict, Any, Callable, List
import time

class BinanceClient:
    def __init__(self, api_key: str, api_secret: str):
        self.api_key = api_key
        self.api_secret = api_secret
        self.client = None
        self.bsm = None
        # Cache for latest ticker data (symbol -> {price, time})
        self.ticker_cache: Dict[str, Dict] = {}
        # Cache for order book data (symbol -> {bids, asks})
        self.order_book_cache: Dict[str, Dict] = {}
        # Rate limiting
        self.last_request_time = 0
        self.REQUEST_WEIGHT_LIMIT = 1100  # Stay under 1200/min
        
    async def initialize(self):
        """Initialize the Binance client"""
        self.client = await AsyncClient.create(self.api_key, self.api_secret)
        self.bsm = BinanceSocketManager(self.client)
        await self._prefetch_exchange_info()
        
    async def _prefetch_exchange_info(self):
        """Prefetch exchange info for symbol filters"""
        info = await self.client.exchange_info()
        self.symbol_info = {s['symbol']: s for s in info['symbols']}
        
    def _rate_limit_check(self):
        """Enforce rate limits"""
        now = time.time() * 1000  # ms
        min_interval = 60000 / self.REQUEST_WEIGHT_LIMIT  # ~55ms between requests
        if now - self.last_request_time < min_interval:
            sleep_time = (min_interval - (now - self.last_request_time)) / 1000
            time.sleep(sleep_time)
        self.last_request_time = time.time() * 1000
        
    async def start_combined_stream(self, streams: List[str], callback: Callable):
        """Start a combined stream for multiple symbols"""
        async with self.bsm.combined_stream(streams) as stream:
            while True:
                try:
                    resp = await stream.recv()
                    data = resp['data']
                    # Update caches
                    if 'e' in data:
                        if data['e'] == '24hrMiniTicker':
                            symbol = data['s']
                            self.ticker_cache[symbol] = {
                                'price': float(data['c']),
                                'time': int(data['E'])
                            }
                        elif data['e'] == 'depthUpdate':
                            symbol = data['s']
                            if symbol not in self.order_book_cache:
                                self.order_book_cache[symbol] = {'bids': [], 'asks': []}
                            # Update top 5 bids/asks
                            self.order_book_cache[symbol]['bids'] = [
                                [float(b[0]), float(b[1])] for b in data['b'][:5]
                            ]
                            self.order_book_cache[symbol]['asks'] = [
                                [float(a[0]), float(a[1])] for a in data['a'][:5]
                            ]
                    await callback(data)
                except Exception as e:
                    print(f"WebSocket error: {e}")
                    await asyncio.sleep(1)
                    
    async def create_order(self, symbol: str, side: str, quantity: float, 
                          order_type: str = ORDER_TYPE_LIMIT, price: float = None):
        """Create a new order"""
        self._rate_limit_check()
        params = {
            'symbol': symbol,
            'side': side,
            'type': order_type,
            'quantity': self._format_quantity(symbol, quantity),
        }
        if order_type == ORDER_TYPE_LIMIT and price:
            params['price'] = self._format_price(symbol, price)
            params['timeInForce'] = TIME_IN_FORCE_GTC
        
        try:
            order = await self.client.create_order(**params)
            return order
        except Exception as e:
            raise Exception(f"Binance order failed: {str(e)}")
            
    def _format_quantity(self, symbol: str, quantity: float) -> str:
        """Format quantity according to symbol's lot size filter"""
        info = self.symbol_info.get(symbol, {})
        lot_size_filter = next((f for f in info['filters'] if f['filterType'] == 'LOT_SIZE'), None)
        if not lot_size_filter:
            return f"{quantity:.8f}"
        step_size = lot_size_filter['stepSize']
        precision = len(step_size.split('.')[1].rstrip('0')) if '.' in step_size else 0
        return f"{quantity:.{precision}f}"
        
    def _format_price(self, symbol: str, price: float) -> str:
        """Format price according to symbol's price filter"""
        info = self.symbol_info.get(symbol, {})
        price_filter = next((f for f in info['filters'] if f['filterType'] == 'PRICE_FILTER'), None)
        if not price_filter:
            return f"{price:.8f}"
        tick_size = price_filter['tickSize']
        precision = len(tick_size.split('.')[1].rstrip('0')) if '.' in tick_size else 0
        return f"{price:.{precision}f}"
        
    async def get_account(self):
        """Get account information"""
        self._rate_limit_check()
        return await self.client.get_account()
        
    async def get_klines(self, symbol: str, interval: str = "1m", limit: int = 500):
        """Get kline/candlestick data"""
        self._rate_limit_check()
        return await self.client.get_klines(symbol=symbol, interval=interval, limit=limit)
        
    async def get_symbol_ticker(self, symbol: str):
        """Get latest price for a symbol"""
        self._rate_limit_check()
        return await self.client.get_symbol_ticker(symbol=symbol)
        
    async def close(self):
        """Close connections"""
        await self.client.close_connection()