# D:\AASHISH\Projects\trade\backend\strategies\manager.py
import uuid
from typing import Any, Dict

from .  import BBRSIMeanReversion

STRATEGIES = {
    "BBRSIMeanReversion": BBRSIMeanReversion,
    "momentum":           BBRSIMeanReversion,   # alias for PortfolioPanel demo deploy
}


class StrategyManager:
    def __init__(self, binance_client):
        self.client = binance_client
        # active_strategies: run_id → { id, name, symbol, status, paper_mode, pnl, instance }
        self.active_strategies: Dict[str, Dict[str, Any]] = {}

        # Paper trading ledger: run_id → list of simulated fills
        self.paper_positions: Dict[str, list] = {}

    # ------------------------------------------------------------------
    # Deploy
    # ------------------------------------------------------------------

    async def deploy(self, strategy_id: str, params: dict) -> dict:
        """
        Deploy a strategy.
        If paper_mode is True (default), fills are recorded in paper_positions
        and no real orders are sent to Binance.
        """
        strategy_name = params.get("strategy_name", strategy_id)
        if strategy_name not in STRATEGIES:
            if strategy_id not in STRATEGIES:
                raise ValueError(f"Unknown strategy: {strategy_id}")
            strategy_name = strategy_id

        paper_mode        = params.get("paper_mode", True)   # DEFAULT: paper mode ON
        symbol            = params.get("symbol", "BTCUSDT")

        strategy_class    = STRATEGIES[strategy_name]
        strategy_instance = strategy_class(self.client, params)

        run_id = str(uuid.uuid4())

        self.active_strategies[run_id] = {
            "id":         run_id,
            "name":       strategy_name,
            "symbol":     symbol,
            "status":     "running",
            "paper_mode": paper_mode,
            "pnl":        0.0,
            "instance":   strategy_instance,
        }
        self.paper_positions[run_id] = []

        return {
            "strategy_id": run_id,
            "status":      "running",
            "paper_mode":  paper_mode,
            "symbol":      symbol,
        }

    # ------------------------------------------------------------------
    # Stop
    # ------------------------------------------------------------------

    def stop(self, strategy_id: str) -> dict:
        entry = self.active_strategies.pop(strategy_id, None)
        if entry is None:
            return {"strategy_id": strategy_id, "status": "not_found"}
        self.paper_positions.pop(strategy_id, None)
        return {"strategy_id": strategy_id, "status": "stopped"}

    # ------------------------------------------------------------------
    # Status queries (called by ws_server.py REST endpoints)
    # ------------------------------------------------------------------

    def get_active_strategies(self) -> list:
        """Return serialisable list of active strategy summaries."""
        return [
            {
                "id":     sid,
                "symbol": e["symbol"],
                "status": e["status"],
                "pnl":    e["pnl"],
                "paper":  e["paper_mode"],
            }
            for sid, e in self.active_strategies.items()
        ]

    def get_strategy_status(self, strategy_id: str) -> dict:
        entry = self.active_strategies.get(strategy_id)
        if entry is None:
            return {"strategy_id": strategy_id, "status": "not_found"}
        return {
            "id":     strategy_id,
            "symbol": entry["symbol"],
            "status": entry["status"],
            "pnl":    entry["pnl"],
            "paper":  entry["paper_mode"],
            "fills":  self.paper_positions.get(strategy_id, []),
        }

    # ------------------------------------------------------------------
    # Paper fill recording
    # ------------------------------------------------------------------

    def record_paper_fill(
        self,
        strategy_id: str,
        action:      str,
        price:       float,
        quantity:    float,
    ) -> None:
        """Record a simulated fill — called by strategy signals in paper mode."""
        import time
        fills = self.paper_positions.setdefault(strategy_id, [])
        fills.append({
            "action":   action,
            "price":    price,
            "quantity": quantity,
            "ts":       int(time.time() * 1000),
        })