import type { Trade } from '../types/trade'

interface TradeBlotterProps {
  trades: Trade[]
  onCreate: () => void
  onAmend: (trade: Trade) => void
  onCancel: (trade: Trade) => void
}

function TradeBlotter({ trades, onCreate, onAmend, onCancel }: TradeBlotterProps) {
  return (
    <section className="trade-blotter">
      <div className="trade-blotter-header">
        <h1>Trade Blotter</h1>
        <button type="button" onClick={onCreate}>
          Create Trade
        </button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Side</th>
            <th>Quantity</th>
            <th>Price</th>
            <th>Trader</th>
            <th>Trade Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {trades.length === 0 && (
            <tr>
              <td colSpan={8} className="empty-row">
                No trades yet.
              </td>
            </tr>
          )}
          {trades.map((trade) => {
            const isActive = trade.status === 'ACTIVE'
            return (
              <tr key={trade.id} className={!isActive ? 'cancelled' : undefined}>
                <td>{trade.symbol}</td>
                <td>{trade.side}</td>
                <td>{trade.quantity}</td>
                <td>{trade.price.toFixed(2)}</td>
                <td>{trade.trader}</td>
                <td>{trade.tradeDate.slice(0, 10)}</td>
                <td>{trade.status}</td>
                <td className="actions">
                  <button type="button" onClick={() => onAmend(trade)} disabled={!isActive}>
                    Amend
                  </button>
                  <button type="button" onClick={() => onCancel(trade)} disabled={!isActive}>
                    Cancel
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}

export default TradeBlotter
