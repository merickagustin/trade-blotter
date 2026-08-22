import { useEffect, useState } from 'react'
import { tradesApi } from './api/trades'
import PositionSummary from './components/PositionSummary'
import TradeBlotter from './components/TradeBlotter'
import TradeFormModal from './components/TradeFormModal'
import type { NewTrade, PositionSummary as PositionSummaryData, Trade } from './types/trade'
import './App.css'

type ModalState = { mode: 'create' } | { mode: 'amend'; trade: Trade } | null
type Tab = 'blotter' | 'positions'

function App() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [positions, setPositions] = useState<PositionSummaryData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>(null)
  const [tab, setTab] = useState<Tab>('blotter')

  function fetchPositions() {
    tradesApi.positions().then(setPositions).catch(() => {
      // Non-critical — leave positions stale rather than surfacing a page-level error over this.
    })
  }

  // One-time load of whatever trades already exist, on first mount.
  useEffect(() => {
    tradesApi
      .list()
      .then(setTrades)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load trades'))
      .finally(() => setLoading(false))
    fetchPositions()
  }, [])

  // Live updates: the backend broadcasts every create/amend/cancel to all connected clients
  // (including whichever tab triggered it), so this is the only place `trades` gets mutated
  // after the initial load — handleCreate/handleAmend/handleCancel below intentionally don't
  // touch state themselves, to avoid applying the same change twice. Positions are computed
  // server-side, so they're refetched (not derived) on every trade event too.
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws`)

    socket.onmessage = (event) => {
      const { trade } = JSON.parse(event.data) as { type: string; trade: Trade }
      setTrades((prev) =>
        prev.some((t) => t.tradeId === trade.tradeId)
          ? prev.map((t) => (t.tradeId === trade.tradeId ? trade : t))
          : [...prev, trade],
      )
      fetchPositions()
    }

    return () => socket.close()
  }, [])

  // Fire the request and close the modal; the grid updates itself via the WebSocket message.
  async function handleCreate(data: NewTrade) {
    await tradesApi.create(data)
    setModal(null)
  }

  async function handleAmend(tradeId: string, data: NewTrade) {
    await tradesApi.amend(tradeId, data)
    setModal(null)
  }

  // Cancel is a direct row action (no modal), guarded by a confirm dialog since it's irreversible.
  async function handleCancel(trade: Trade) {
    if (!confirm(`Cancel trade ${trade.symbol} (${trade.tradeId})?`)) return
    try {
      await tradesApi.cancel(trade.tradeId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel trade')
    }
  }

  return (
    <section id="dashboard">
      {error && <p className="banner-error">{error}</p>}

      {loading ? (
        <p>Loading trades…</p>
      ) : (
        <>
          <div className="tabs">
            <button
              type="button"
              className={tab === 'blotter' ? 'active' : undefined}
              onClick={() => setTab('blotter')}
            >
              Trade Blotter
            </button>
            <button
              type="button"
              className={tab === 'positions' ? 'active' : undefined}
              onClick={() => setTab('positions')}
            >
              Position Summary
            </button>
          </div>

          {tab === 'blotter' ? (
            <TradeBlotter
              trades={trades}
              onCreate={() => setModal({ mode: 'create' })}
              onAmend={(trade) => setModal({ mode: 'amend', trade })}
              onCancel={handleCancel}
            />
          ) : (
            <PositionSummary positions={positions} />
          )}
        </>
      )}

      {modal?.mode === 'create' && (
        <TradeFormModal mode="create" onClose={() => setModal(null)} onSubmit={handleCreate} />
      )}
      {modal?.mode === 'amend' && (
        <TradeFormModal
          mode="amend"
          initialTrade={modal.trade}
          onClose={() => setModal(null)}
          onSubmit={(data) => handleAmend(modal.trade.tradeId, data)}
        />
      )}
    </section>
  )
}

export default App
