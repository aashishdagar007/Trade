# D:\AASHISH\Projects\trade\backend\strategies\manager.py
from . import EMACrossover, RSIMeanReversion, BollingerBands

STRATEGIES = {
    "EMACrossover": EMACrossover,
    "RSIMeanReversion": RSIMeanReversion,
    "BollingerBands": BollingerBands
}

class StrategyManager:
    def __init__(self, binance_client):
        self.client = binance_client
        self.active_strategies = {}  # strategy_id -> instance
    
    async def deploy(self, strategy_id: str, params: dict):
        if strategy_id not in STRATEGIES:
            raise ValueError(f"Unknown strategy: {strategy_id}")
        
        strategy_class = STRATEGIES[strategy_id]
        strategy = strategy_class(self.client, params)
        # In a real implementation, you'd store this and run it in a background task
        # For simplicity, we're just returning the strategy instance
        return strategy
    
    def get_active_strategies(self):
        return list(self.active_strategies.keys())