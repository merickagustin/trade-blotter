import type { PnLViewProps } from '../types/trade'

function pnlClass(value: number) {
  return value < 0 ? 'pnl-negative' : undefined
}

function PnLView({ pnl }: PnLViewProps) {
  return (
    <section className="position-summary">
      <h2>P&amp;L View</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Realized P&amp;L</th>
              <th>Unrealized P&amp;L</th>
              <th>Total P&amp;L</th>
              <th>Latest Price</th>
            </tr>
          </thead>
          <tbody>
            {pnl.length === 0 && (
              <tr>
                <td colSpan={5} className="empty-row">
                  No P&amp;L to show.
                </td>
              </tr>
            )}
            {pnl.map((row) => (
              <tr key={row.symbol}>
                <td>{row.symbol}</td>
                <td className={pnlClass(row.realizedPnl)}>{row.realizedPnl.toFixed(2)}</td>
                <td className={pnlClass(row.unrealizedPnl)}>{row.unrealizedPnl.toFixed(2)}</td>
                <td className={pnlClass(row.totalPnl)}>{row.totalPnl.toFixed(2)}</td>
                <td>{row.latestPrice.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default PnLView
