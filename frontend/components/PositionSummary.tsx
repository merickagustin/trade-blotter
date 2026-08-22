import type { PositionSummaryProps } from '../types/trade'

function PositionSummary({ positions }: PositionSummaryProps) {
  return (
    <section className="position-summary">
      <h2>Position Summary</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Net Quantity</th>
            </tr>
          </thead>
          <tbody>
            {positions.length === 0 && (
              <tr>
                <td colSpan={2} className="empty-row">
                  No open positions.
                </td>
              </tr>
            )}
            {positions.map((position) => (
              <tr key={position.symbol}>
                <td>{position.symbol}</td>
                <td className={position.netQuantity < 0 ? 'pnl-negative' : undefined}>
                  {position.netQuantity}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default PositionSummary
