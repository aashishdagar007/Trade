import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

/**
 * Thin wrapper around react-grid-layout. Each panel registers itself here;
 * adding a new panel TYPE (e.g. OrderBookPanel) is just:
 *   1. build the component
 *   2. add a case to renderPanel() below
 *   3. push a layout entry when the command bar creates one
 * The grid itself never needs to change.
 */

import ChartPanel from '../ChartPanel';

function renderPanel(panel) {
  switch (panel.type) {
    case 'chart':
      return <ChartPanel symbol={panel.symbol} />;
    case 'news':
      return <div className="panel-placeholder">News feed</div>;
    case 'watchlist':
      return <div className="panel-placeholder">Watchlist</div>;
    case 'portfolio':
      return <div className="panel-placeholder">Portfolio / P&amp;L</div>;
    default:
      return <div className="panel-placeholder">Unknown panel type</div>;
  }
}

export default function PanelGrid({ panels }) {
  const layout = panels.map((p, i) => ({
    i: p.id,
    x: (i * 4) % 12,
    y: Math.floor(i / 3) * 6,
    w: 4,
    h: 6,
  }));

  return (
    <GridLayout
      className="panel-grid"
      layout={layout}
      cols={12}
      rowHeight={40}
      width={1600}
      draggableHandle=".panel__header"
    >
      {panels.map((panel) => (
        <div key={panel.id} className="panel">
          <div className="panel__header">
            {panel.symbol ? `${panel.symbol} — ${panel.type.toUpperCase()}` : panel.type.toUpperCase()}
          </div>
          <div className="panel__body">{renderPanel(panel)}</div>
        </div>
      ))}
    </GridLayout>
  );
}
