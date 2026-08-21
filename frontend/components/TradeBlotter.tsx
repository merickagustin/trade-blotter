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
            <th>Trade ID</th>
            <th>Symbol</th>
            <th>Side</th>
            <th>Quantity</th>
            <th>Price</th>
            <th>Trader</th>
            <th>Book</th>
            <th>Counterparty</th>
            <th>Trade Timestamp</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {trades.length === 0 && (
            <tr>
              <td colSpan={11} className="empty-row">
                No trades yet.
              </td>
            </tr>
          )}
          {trades.map((trade) => {
            const isActive = trade.status === 'ACTIVE'
            return (
              <tr key={trade.tradeId} className={!isActive ? 'cancelled' : undefined}>
                <td>{trade.tradeId}</td>
                <td>{trade.symbol}</td>
                <td>{trade.side}</td>
                <td>{trade.quantity}</td>
                <td>{trade.price.toFixed(2)}</td>
                <td>{trade.trader}</td>
                <td>{trade.book}</td>
                <td>{trade.counterparty}</td>
                <td>{trade.tradeTimestamp.replace('T', ' ').replace('Z', '')}</td>
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
