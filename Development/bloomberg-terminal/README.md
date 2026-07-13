# Bloomberg Terminal Replica

A dense, keyboard-driven trading terminal: live crypto (Binance) + equities
(yfinance) data, command-bar navigation, dockable panels.

## Status: Phase 1-2 skeleton

- [x] Provider abstraction (`backend/providers/base.py`)
- [x] Binance crypto provider (real WS streaming)
- [x] Equities provider (yfinance, polled but exposed as a stream)
- [x] Canonical tick normalizer
- [x] Unified WebSocket server (multiplexes symbol feeds)
- [x] REST endpoints: `/api/history/{symbol}`, `/api/search`
- [x] Electron shell: secure main/preload split, global Ctrl+K shortcut
- [x] Command bar with BBG-style parsing (`AAPL US<GO>`, `BTC USDT<GO>`)
- [x] Panel grid (drag/resize) with placeholder panels
- [ ] Real ChartPanel (lightweight-charts) -- **next task, see below**
- [ ] TimescaleDB persistence layer
- [ ] News + sentiment panel
- [ ] Portfolio/execution panel (port the existing paper-trading bot)

## Running it

Backend:
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Frontend:
```bash
cd electron-app
npm install
npm run dev
```

## Immediate next steps (in order)

1. **Wire the real ChartPanel.** Install `lightweight-charts`, replace the
   `chart` case in `PanelGrid.jsx`'s `renderPanel()` with a component that:
   - on mount, calls `GET /api/history/{symbol}` for backfill
   - subscribes via `marketDataClient.subscribe(symbol, tick => ...)` for live updates
   - appends live ticks to the chart series
   This is the single highest-value next step -- it's what turns the shell into
   something that actually looks like a terminal.

2. **Symbol autocomplete in the command bar.** Debounce input, hit
   `GET /api/search?q=...`, show a dropdown. Small UX win, makes the demo feel real.

3. **Persist ticks to TimescaleDB.** Right now ticks only exist in-memory as
   they fly through the WS server. Add a write-behind buffer in `ws_server.py`
   that batches and inserts into Postgres/Timescale every N seconds, so
   history isn't 100% dependent on the upstream provider's own retention.

4. **Watchlist panel with real subscriptions.** Straightforward once #1 exists
   -- same subscribe pattern, just render as rows instead of a chart.

5. **Port the paper-trading bot into a Portfolio panel.** You already have the
   P&L logic and Binance order flow from the tkinter version -- this is a UI
   port, not new logic.

## Architecture notes

See `backend/providers/router.py` for how a symbol gets routed to crypto vs
equity. See `backend/ws_server.py` for the subscription multiplexing --
multiple panels watching the same symbol share one upstream feed.
